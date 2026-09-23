begin;
create table public.listing_submissions (
  id uuid primary key,
  fingerprint text not null,
  property jsonb not null,
  contact jsonb not null,
  photo_paths text[] not null check(cardinality(photo_paths) between 1 and 4),
  status text not null default 'uploading' check(status in ('uploading','pending','published','rejected')),
  revision integer not null default 0,
  review_note text not null default '',
  created_at timestamptz not null default now()
);
create table public.published_listings (
  id uuid primary key references public.listing_submissions(id),
  property jsonb not null,
  photo_paths text[] not null,
  published_at timestamptz not null default now()
);
alter table public.listing_submissions enable row level security;
alter table public.published_listings enable row level security;
revoke all on public.listing_submissions,public.published_listings from public,anon,authenticated;
grant select on public.listing_submissions to authenticated;
grant select on public.published_listings to anon,authenticated;
grant all on public.listing_submissions to service_role;
create policy listing_staff_read on public.listing_submissions for select to authenticated using ((select private.is_staff()));
create policy published_read on public.published_listings for select to anon,authenticated using(true);

create function public.reserve_listing(p_id uuid,p_fingerprint text,p_property jsonb,p_contact jsonb,p_paths text[],p_client_hash text)
returns text language plpgsql security definer set search_path='' as $$
declare existing public.listing_submissions; n integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(723093);
  select * into existing from public.listing_submissions where id=p_id;
  if found then
    if existing.fingerprint<>p_fingerprint then raise exception 'conflict'; end if;
    return existing.status;
  end if;
  if p_fingerprint !~ '^[a-f0-9]{64}$' or p_client_hash !~ '^[a-f0-9]{64}$' or cardinality(p_paths) not between 1 and 4 then raise exception 'invalid'; end if;
  if exists(select 1 from unnest(p_paths) path where path !~ ('^'||p_id::text||'/[0-3]\.(jpg|png|webp)$')) then raise exception 'invalid_path'; end if;
  delete from public.enquiry_rate_limits where window_start < now()-interval '2 days';
  insert into public.enquiry_rate_limits values('listing:'||p_client_hash,now(),1)
  on conflict(bucket) do update set count=case when enquiry_rate_limits.window_start<now()-interval '1 day' then 1 else enquiry_rate_limits.count+1 end,
    window_start=case when enquiry_rate_limits.window_start<now()-interval '1 day' then now() else enquiry_rate_limits.window_start end returning count into n;
  if n>5 then raise exception 'rate_limit'; end if;
  insert into public.enquiry_rate_limits values('listing:global',now(),1)
  on conflict(bucket) do update set count=case when enquiry_rate_limits.window_start<now()-interval '1 day' then 1 else enquiry_rate_limits.count+1 end,
    window_start=case when enquiry_rate_limits.window_start<now()-interval '1 day' then now() else enquiry_rate_limits.window_start end returning count into n;
  if n>100 then raise exception 'rate_limit'; end if;
  insert into public.listing_submissions(id,fingerprint,property,contact,photo_paths) values(p_id,p_fingerprint,p_property,p_contact,p_paths);
  return 'uploading';
end $$;

create function public.review_listing(p_id uuid,p_revision integer,p_decision text,p_note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare submission public.listing_submissions; public_details jsonb;
begin
  if not private.is_staff() then raise exception 'staff_mfa_required' using errcode='42501'; end if;
  select * into submission from public.listing_submissions where id=p_id for update;
  if not found or submission.revision<>p_revision or submission.status='uploading' then raise exception 'conflict'; end if;
  if p_decision not in ('published','rejected') or length(p_note)>2000 then raise exception 'invalid'; end if;
  if p_decision='published' then
    if submission.status<>'pending' then raise exception 'not_pending'; end if;
    if (select count(*) from storage.objects where bucket_id='listing-photos' and name=any(submission.photo_paths))<>cardinality(submission.photo_paths) then raise exception 'photos_missing'; end if;
    -- Explicit allowlist: never publish private contact, fingerprint or review notes.
    select jsonb_object_agg(key,value) into public_details from jsonb_each(submission.property)
      where key=any(array['title','city','district','postal','price','type','beds','baths','area','description','mode','parking','outdoor']);
    insert into public.published_listings(id,property,photo_paths) values(p_id,public_details,submission.photo_paths);
  else
    delete from public.published_listings where id=p_id;
  end if;
  update public.listing_submissions set status=p_decision,revision=revision+1,review_note=coalesce(p_note,'') where id=p_id;
  insert into public.audit_events(actor_id,action,metadata) values(auth.uid(),'listing_'||p_decision,jsonb_build_object('listing_id',p_id));
end $$;
revoke all on function public.reserve_listing(uuid,text,jsonb,jsonb,text[],text),public.review_listing(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.reserve_listing(uuid,text,jsonb,jsonb,text[],text) to service_role;
grant execute on function public.review_listing(uuid,integer,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('listing-photos','listing-photos',false,1572864,array['image/jpeg','image/png','image/webp']);
create function public.can_read_listing_photo(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.published_listings where p_path=any(photo_paths))
    or (private.is_staff() and exists(select 1 from public.listing_submissions where p_path=any(photo_paths)));
$$;
revoke all on function public.can_read_listing_photo(text) from public;
grant execute on function public.can_read_listing_photo(text) to anon,authenticated;
grant select on storage.objects to anon;
create policy listing_photo_read on storage.objects for select to anon,authenticated
  using(bucket_id='listing-photos' and public.can_read_listing_photo(name));
commit;
