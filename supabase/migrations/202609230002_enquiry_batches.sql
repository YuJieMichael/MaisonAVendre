-- Private enquiry inbox. Browser roles cannot read, insert, or call worker RPCs.
create table public.enquiry_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lease_until timestamptz,
  first_attempt_at timestamptz,
  sent_at timestamptz,
  provider_id text,
  needs_review boolean not null default false
);
create table public.enquiries (
  id uuid primary key,
  created_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  batch_id uuid references public.enquiry_batches(id)
);
create index enquiries_pending on public.enquiries(created_at, id) where batch_id is null;
create table public.enquiry_rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  count integer not null
);
alter table public.enquiries enable row level security;
alter table public.enquiry_batches enable row level security;
alter table public.enquiry_rate_limits enable row level security;
revoke all on public.enquiries, public.enquiry_batches, public.enquiry_rate_limits from public, anon, authenticated;

create function public.collect_enquiry(p_id uuid, p_payload jsonb, p_client_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare n integer; old_payload jsonb;
begin
  if length(p_payload::text) > 16000 or p_payload->>'kind' not in ('buyer','seller')
    or coalesce(length(trim(p_payload->>'name')),0) = 0
    or coalesce(p_payload->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_client_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_input'; end if;
  -- Serialize duplicate requests and rate counters. No personal data in rate keys.
  perform pg_catalog.pg_advisory_xact_lock(723091);
  select payload into old_payload from public.enquiries where id=p_id;
  if found then
    if old_payload <> p_payload then raise exception 'idempotency_conflict'; end if;
    return;
  end if;
  delete from public.enquiry_rate_limits where window_start < now()-interval '2 days';
  insert into public.enquiry_rate_limits values ('client:'||p_client_hash,now(),1)
  on conflict(bucket) do update set
    count=case when enquiry_rate_limits.window_start < now()-interval '15 minutes' then 1 else enquiry_rate_limits.count+1 end,
    window_start=case when enquiry_rate_limits.window_start < now()-interval '15 minutes' then now() else enquiry_rate_limits.window_start end
  returning count into n;
  if n>5 then raise exception 'rate_limit'; end if;
  insert into public.enquiry_rate_limits values ('daily',now(),1)
  on conflict(bucket) do update set
    count=case when enquiry_rate_limits.window_start < now()-interval '1 day' then 1 else enquiry_rate_limits.count+1 end,
    window_start=case when enquiry_rate_limits.window_start < now()-interval '1 day' then now() else enquiry_rate_limits.window_start end
  returning count into n;
  if n>1000 then raise exception 'rate_limit'; end if;
  insert into public.enquiries(id,payload) values(p_id,p_payload);
end $$;

create function public.claim_enquiry_batch()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.enquiry_batches; ids uuid[]; rows jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(723092);
  -- Resend deduplicates for 24h. Stop uncertain old attempts before that expires,
  -- so an operator can reconcile provider delivery without duplicate sends.
  update public.enquiry_batches set needs_review=true where sent_at is null
    and first_attempt_at < now()-interval '23 hours';
  select * into b from public.enquiry_batches where sent_at is null and not needs_review
    and (lease_until is null or lease_until < now()) order by created_at,id limit 1 for update;
  if not found then
    select array_agg(id) into ids from (select id from public.enquiries where batch_id is null order by created_at,id limit 10) q;
    if coalesce(array_length(ids,1),0)<10 then return null; end if;
    insert into public.enquiry_batches default values returning * into b;
    update public.enquiries set batch_id=b.id where id=any(ids);
  end if;
  update public.enquiry_batches set lease_until=now()+interval '5 minutes',first_attempt_at=coalesce(first_attempt_at,now()) where id=b.id;
  select jsonb_agg(payload || jsonb_build_object('created_at',created_at) order by created_at,id)
    into rows from public.enquiries where batch_id=b.id;
  return jsonb_build_object('id',b.id,'rows',rows);
end $$;

create function public.complete_enquiry_batch(p_id uuid,p_provider_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(length(p_provider_id),0)=0 then raise exception 'provider_id_required'; end if;
  update public.enquiry_batches set sent_at=coalesce(sent_at,now()),provider_id=p_provider_id,lease_until=null where id=p_id;
end $$;
revoke all on function public.collect_enquiry(uuid,jsonb,text),public.claim_enquiry_batch(),public.complete_enquiry_batch(uuid,text) from public,anon,authenticated;
grant execute on function public.collect_enquiry(uuid,jsonb,text),public.claim_enquiry_batch(),public.complete_enquiry_batch(uuid,text) to service_role;
