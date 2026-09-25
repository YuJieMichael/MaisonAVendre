begin;

create table public.broker_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  license_number text not null check (char_length(license_number) between 3 and 40),
  agency_name text not null check (char_length(agency_name) between 2 and 150),
  contact_email text not null check (char_length(contact_email) between 3 and 254),
  contact_phone text not null default '' check (char_length(contact_phone) <= 40),
  bio text not null default '' check (char_length(bio) <= 500),
  public_consent boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'verified', 'changes_requested')),
  revision integer not null default 0 check (revision >= 0),
  review_note text not null default '' check (char_length(review_note) <= 2000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  check (contact_phone = '' or contact_phone ~ '^[+0-9() .-]{7,40}$'),
  check (public_consent or status <> 'verified')
);
create index broker_applications_queue_idx on public.broker_applications(status, submitted_at);
alter table public.broker_applications enable row level security;
revoke all on public.broker_applications from public, anon, authenticated;
grant select on public.broker_applications to authenticated;
grant all on public.broker_applications to service_role;

create policy broker_application_owner_read on public.broker_applications
  for select to authenticated using (user_id = (select auth.uid()));
create policy broker_application_staff_read on public.broker_applications
  for select to authenticated using ((select private.is_staff()));

create function public.submit_broker_application(
  p_full_name text,
  p_license_number text,
  p_agency_name text,
  p_contact_email text,
  p_contact_phone text,
  p_bio text,
  p_public_consent boolean
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_existing public.broker_applications;
  v_id uuid;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_license text := btrim(coalesce(p_license_number, ''));
  v_agency text := btrim(coalesce(p_agency_name, ''));
  v_email text := lower(btrim(coalesce(p_contact_email, '')));
  v_phone text := btrim(coalesce(p_contact_phone, ''));
  v_bio text := btrim(coalesce(p_bio, ''));
begin
  if char_length(v_name) not between 2 and 100 or v_name ~ '[[:cntrl:]]'
    or char_length(v_license) not between 3 and 40 or v_license !~ '^[[:alnum:] -]+$'
    or char_length(v_agency) not between 2 and 150 or v_agency ~ '[[:cntrl:]]'
    or char_length(v_email) not between 3 and 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or (v_phone <> '' and (char_length(v_phone) not between 7 and 40 or v_phone !~ '^[+0-9() .-]+$'))
    or char_length(v_bio) > 500 or v_bio ~ '[[:cntrl:]]'
    or p_public_consent is distinct from true then
    raise exception 'Invalid broker application or missing public profile consent' using errcode = '22023';
  end if;

  select * into v_existing from public.broker_applications where user_id = v_uid for update;
  if not found then
    insert into public.broker_applications(user_id, full_name, license_number, agency_name,
      contact_email, contact_phone, bio, public_consent)
    values(v_uid, v_name, v_license, v_agency, v_email, v_phone, v_bio, true)
    returning id into v_id;
  else
    update public.broker_applications set full_name = v_name, license_number = v_license,
      agency_name = v_agency, contact_email = v_email, contact_phone = v_phone,
      bio = v_bio, public_consent = true, status = 'pending', revision = revision + 1,
      review_note = '', reviewed_by = null, reviewed_at = null,
      submitted_at = now(), updated_at = now()
    where user_id = v_uid returning id into v_id;
  end if;
  insert into public.audit_events(actor_id, action, metadata)
    values(v_uid, 'broker_application_submitted', jsonb_build_object('application_id', v_id));
  return v_id;
end;
$$;

create function public.review_broker_application(
  p_application_id uuid,
  p_expected_revision integer,
  p_decision text,
  p_note text default ''
)
returns public.broker_applications language plpgsql security definer set search_path = '' as $$
declare
  v_application public.broker_applications;
  v_note text := btrim(coalesce(p_note, ''));
begin
  if not private.is_staff() then raise exception 'Verified administrator access required' using errcode = '42501'; end if;
  if p_decision not in ('verified', 'changes_requested') or char_length(v_note) > 2000
    or v_note = '' then
    raise exception 'Invalid verification decision or missing note' using errcode = '22023';
  end if;
  select * into v_application from public.broker_applications where id = p_application_id for update;
  if not found then raise exception 'Broker application not found' using errcode = 'P0002'; end if;
  if v_application.revision <> p_expected_revision then
    raise exception 'Broker application changed. Reload before reviewing.' using errcode = '40001';
  end if;
  if v_application.status <> 'pending' then
    raise exception 'Broker application is not awaiting review' using errcode = '22023';
  end if;
  update public.broker_applications set status = p_decision, review_note = v_note,
    revision = revision + 1, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_application_id returning * into v_application;
  insert into public.audit_events(actor_id, action, metadata)
    values(auth.uid(), case when p_decision = 'verified' then 'broker_verified' else 'broker_changes_requested' end,
      jsonb_build_object('application_id', p_application_id, 'revision', v_application.revision, 'note', v_note));
  return v_application;
end;
$$;

create function public.get_verified_brokers()
returns table (
  application_id uuid,
  full_name text,
  license_number text,
  agency_name text,
  contact_email text,
  contact_phone text,
  bio text,
  verified_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select b.id, b.full_name, b.license_number, b.agency_name, b.contact_email,
    b.contact_phone, b.bio, b.reviewed_at
  from public.broker_applications b
  where b.status = 'verified' and b.public_consent = true
  order by b.agency_name, b.full_name;
$$;

revoke all on function public.submit_broker_application(text,text,text,text,text,text,boolean),
  public.review_broker_application(uuid,integer,text,text), public.get_verified_brokers()
  from public, anon, authenticated;
grant execute on function public.submit_broker_application(text,text,text,text,text,text,boolean),
  public.review_broker_application(uuid,integer,text,text) to authenticated;
grant execute on function public.get_verified_brokers() to anon, authenticated;

commit;
