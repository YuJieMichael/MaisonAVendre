begin;
alter table public.listing_submissions add column video_path text check(video_path is null or video_path ~ ('^'||id::text||'/video\.(mp4|webm)$'));
alter table public.published_listings add column video_path text check(video_path is null or video_path ~ ('^'||id::text||'/video\.(mp4|webm)$'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('listing-videos','listing-videos',false,10485760,array['video/mp4','video/webm']);
-- Publication remains atomic with review_listing; never accept an arbitrary URL.
create function private.attach_reviewed_video() returns trigger language plpgsql security definer set search_path='' as $$
begin
  select video_path into new.video_path from public.listing_submissions where id=new.id;
  if new.video_path is not null and not exists(select 1 from storage.objects where bucket_id='listing-videos' and name=new.video_path) then raise exception 'video_missing'; end if;
  return new;
end $$;
revoke all on function private.attach_reviewed_video() from public,anon,authenticated;
create trigger attach_reviewed_video before insert on public.published_listings for each row execute function private.attach_reviewed_video();
create function public.can_read_listing_video(p_path text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.published_listings where video_path=p_path)
    or (private.is_staff() and exists(select 1 from public.listing_submissions where video_path=p_path));
$$;
revoke all on function public.can_read_listing_video(text) from public;
grant execute on function public.can_read_listing_video(text) to anon,authenticated;
create policy listing_video_read on storage.objects for select to anon,authenticated using(bucket_id='listing-videos' and public.can_read_listing_video(name));
commit;
