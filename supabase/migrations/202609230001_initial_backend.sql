-- ProprieteAVendre: private seller projects, reviewed by invited MFA staff.
-- Run once as postgres using Supabase migrations. Never run with a browser key.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'operator')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'without' check (plan in ('with', 'without')),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  services text[] not null default '{}' check (
    services <@ array['photo', 'video', 'analysis', 'consult', 'listing']::text[]
    and cardinality(services) <= 5 and array_position(services, null) is null
  ),
  completed boolean not null default false,
  visits jsonb not null default '[]' check (jsonb_typeof(visits) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'changes_requested')),
  review_note text not null default '',
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_files (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('photo', 'document')),
  name text not null check (char_length(name) between 1 and 255 and name !~ '[[:cntrl:]]'),
  size bigint not null check (size between 1 and 10485760),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  check (kind <> 'photo' or mime_type in ('image/jpeg', 'image/png', 'image/webp'))
);
create index project_files_project_id_idx on public.project_files(project_id);
create index projects_review_queue_idx on public.projects(status, updated_at desc);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index audit_events_project_idx on public.audit_events(project_id, created_at desc);

-- SECURITY DEFINER helpers have a fixed empty search_path and schema-qualified
-- references. Roles come from the table, never editable user_metadata claims.
create function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt()->>'aal' = 'aal2', false)
    and exists (select 1 from public.staff_members s where s.user_id = auth.uid() and s.active);
$$;

create function private.owns_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid());
$$;

create function private.require_user()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    raise exception 'Verify your email before saving a project' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

create function private.valid_iso_date(p_value text)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if p_value is null or p_value !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  return to_char(p_value::date, 'YYYY-MM-DD') = p_value;
exception when invalid_datetime_format or datetime_field_overflow then return false;
end;
$$;

create function private.validate_project_input(p_plan text, p_details jsonb, p_services text[], p_visits jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_item record; v_visit jsonb; v_limit integer;
begin
  if p_plan is null or p_plan not in ('with', 'without') then
    raise exception 'Invalid service mode' using errcode = '22023';
  end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object' or octet_length(p_details::text) > 16384 then
    raise exception 'Invalid project details' using errcode = '22023';
  end if;
  for v_item in select key, value from jsonb_each(p_details) loop
    if v_item.key = 'consent' then
      if jsonb_typeof(v_item.value) <> 'boolean' then raise exception 'Invalid consent' using errcode = '22023'; end if;
    else
      v_limit := case v_item.key
        when 'address' then 200 when 'city' then 100 when 'postal' then 7
        when 'type' then 1 when 'price' then 10 when 'broker' then 1
        when 'timeline' then 1 when 'name' then 100 when 'email' then 200
        when 'phone' then 30 when 'date' then 10 when 'time' then 1
        when 'language' then 2 when 'notes' then 3000 else null end;
      if v_limit is null or jsonb_typeof(v_item.value) <> 'string'
        or char_length(p_details->>v_item.key) > v_limit
        or (v_item.key <> 'notes' and (p_details->>v_item.key) ~ '[[:cntrl:]]') then
        raise exception 'Invalid detail field: %', v_item.key using errcode = '22023';
      end if;
    end if;
  end loop;
  if (p_details ? 'type' and p_details->>'type' not in ('0', '1', '2', '3'))
    or (p_details ? 'broker' and p_details->>'broker' not in ('0', '1', '2'))
    or (p_details ? 'timeline' and p_details->>'timeline' not in ('0', '1', '2', '3'))
    or (p_details ? 'time' and p_details->>'time' not in ('0', '1', '2'))
    or (p_details ? 'language' and p_details->>'language' not in ('fr', 'en', 'zh')) then
    raise exception 'Invalid project option' using errcode = '22023';
  end if;
  if coalesce(p_details->>'price', '') <> '' then
    if p_details->>'price' !~ '^[1-9][0-9]{0,9}$' then
      raise exception 'Invalid asking price' using errcode = '22023';
    end if;
  end if;
  if coalesce(p_details->>'date', '') <> '' and not private.valid_iso_date(p_details->>'date') then
    raise exception 'Invalid preferred date' using errcode = '22023';
  end if;
  if p_services is null or not p_services <@ array['photo', 'video', 'analysis', 'consult', 'listing']::text[]
    or cardinality(p_services) > 5 or array_position(p_services, null) is not null
    or cardinality(p_services) <> (select count(distinct s) from unnest(p_services) s) then
    raise exception 'Invalid services' using errcode = '22023';
  end if;
  if p_visits is null or jsonb_typeof(p_visits) <> 'array' or octet_length(p_visits::text) > 65536 then
    raise exception 'Invalid visits' using errcode = '22023';
  end if;
  if jsonb_array_length(p_visits) > 100 then
    raise exception 'At most 100 visit notes are allowed' using errcode = '22023';
  end if;
  for v_visit in select value from jsonb_array_elements(p_visits) loop
    if jsonb_typeof(v_visit) <> 'object' then raise exception 'Invalid visit' using errcode = '22023'; end if;
    if not v_visit ?& array['name', 'date', 'time']
      or (v_visit - array['name', 'date', 'time']) <> '{}'::jsonb
      or jsonb_typeof(v_visit->'name') <> 'string' or jsonb_typeof(v_visit->'date') <> 'string'
      or jsonb_typeof(v_visit->'time') <> 'string'
      or char_length(btrim(v_visit->>'name')) not between 1 and 100
      or (v_visit->>'name') ~ '[[:cntrl:]]'
      or not private.valid_iso_date(v_visit->>'date')
      or (v_visit->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Invalid visit details' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create function private.validate_submission(p_project public.projects)
returns void language plpgsql stable security definer set search_path = '' as $$
declare v_details jsonb := p_project.details;
begin
  perform private.validate_project_input(p_project.plan, v_details, p_project.services, p_project.visits);
  if not p_project.completed
    or coalesce(char_length(btrim(v_details->>'address')), 0) < 3
    or coalesce(char_length(btrim(v_details->>'city')), 0) < 2
    or coalesce(char_length(btrim(v_details->>'name')), 0) < 2
    or coalesce(v_details->>'postal', '') !~* '^[ABCEGHJ-NPRSTVXY][0-9][ABCEGHJ-NPRSTV-Z] ?[0-9][ABCEGHJ-NPRSTV-Z][0-9]$'
    or coalesce(v_details->>'email', '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(v_details->>'phone', '') !~ '^[+0-9() .-]{7,30}$'
    or char_length(regexp_replace(coalesce(v_details->>'phone', ''), '[^0-9]', '', 'g')) < 7
    or v_details->'consent' is distinct from 'true'::jsonb
    or not v_details ?& array['type', 'broker', 'timeline', 'language'] then
    raise exception 'Complete the property, contact and consent fields before submitting' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.project_files f
    join storage.objects o on o.bucket_id = 'project-files' and o.name = f.storage_path
    where f.project_id = p_project.id and f.kind = 'photo'
      and o.metadata->>'size' = f.size::text and o.metadata->>'mimetype' = f.mime_type
  ) then
    raise exception 'Add at least one property photo before submitting' using errcode = '22023';
  end if;
end;
$$;

create function public.get_my_staff_role()
returns text language sql stable security definer set search_path = '' as $$
  select s.role from public.staff_members s where s.user_id = auth.uid() and s.active;
$$;

create function public.ensure_project()
returns public.projects language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_project public.projects;
begin
  insert into public.projects(owner_id) values (v_uid) on conflict (owner_id) do nothing;
  select * into strict v_project from public.projects where owner_id = v_uid;
  return v_project;
end;
$$;

create function public.save_project(
  p_project_id uuid, p_expected_revision integer, p_plan text, p_details jsonb,
  p_services text[], p_completed boolean, p_visits jsonb
)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_project public.projects;
begin
  if p_completed is null then raise exception 'Invalid project completion value' using errcode = '22023'; end if;
  perform private.validate_project_input(p_plan, p_details, p_services, p_visits);
  select * into v_project from public.projects where id = p_project_id and owner_id = v_uid for update;
  if not found then raise exception 'Project not found or access denied' using errcode = '42501'; end if;
  if p_expected_revision is null or v_project.revision <> p_expected_revision then
    raise exception 'Project changed. Reload before saving.' using errcode = '40001';
  end if;
  -- A repeated autosave of the identical snapshot must not undo submission.
  if row(v_project.plan, v_project.details, v_project.services, v_project.completed, v_project.visits)
    is not distinct from row(p_plan, p_details, p_services, p_completed, p_visits) then
    return v_project;
  end if;
  update public.projects set plan = p_plan, details = p_details, services = p_services,
    completed = p_completed, visits = p_visits, status = 'draft', review_note = '',
    revision = revision + 1, updated_at = now()
    where id = p_project_id returning * into v_project;
  return v_project;
end;
$$;

create function public.submit_project(p_project_id uuid, p_expected_revision integer)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_project public.projects;
begin
  select * into v_project from public.projects where id = p_project_id and owner_id = v_uid for update;
  if not found then raise exception 'Project not found or access denied' using errcode = '42501'; end if;
  if p_expected_revision is null or v_project.revision <> p_expected_revision then
    raise exception 'Project changed. Reload before submitting.' using errcode = '40001';
  end if;
  if v_project.status not in ('draft', 'changes_requested') then
    raise exception 'Only a draft or returned project can be submitted' using errcode = '22023';
  end if;
  perform private.validate_submission(v_project);
  if coalesce(v_project.details->>'date', '') <> ''
    and (v_project.details->>'date')::date < timezone('America/Toronto', now())::date then
    raise exception 'Update the preferred date or leave it empty' using errcode = '22023';
  end if;
  update public.projects set status = 'submitted', review_note = '', revision = revision + 1, updated_at = now()
    where id = p_project_id returning * into v_project;
  return v_project;
end;
$$;

create function public.review_project(p_project_id uuid, p_expected_revision integer, p_decision text, p_note text)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare v_project public.projects; v_note text := btrim(coalesce(p_note, ''));
begin
  if not private.is_staff() then raise exception 'An active staff account with MFA is required' using errcode = '42501'; end if;
  if p_decision is null or p_decision not in ('approved', 'changes_requested')
    or char_length(v_note) > 2000 or (p_decision = 'changes_requested' and v_note = '') then
    raise exception 'Invalid decision or missing review note' using errcode = '22023';
  end if;
  select * into v_project from public.projects where id = p_project_id for update;
  if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
  if p_expected_revision is null or v_project.revision <> p_expected_revision then
    raise exception 'Project changed. Reload before reviewing.' using errcode = '40001';
  end if;
  if v_project.status <> 'submitted' then raise exception 'Project is not awaiting review' using errcode = '22023'; end if;
  if p_decision = 'approved' then perform private.validate_submission(v_project); end if;
  update public.projects set status = p_decision, review_note = v_note, revision = revision + 1, updated_at = now()
    where id = p_project_id returning * into v_project;
  insert into public.audit_events(actor_id, project_id, action, metadata)
    values (auth.uid(), p_project_id, 'project_reviewed', jsonb_build_object(
      'decision', p_decision, 'note', v_note, 'reviewed_revision', p_expected_revision, 'revision', v_project.revision));
  return v_project;
end;
$$;

-- Only a verified server-side invite handler using service_role may call this.
-- The handler must first validate the caller JWT and its aal2 claim. Locking the
-- owner row ensures a simultaneous account suspension cannot race the grant.
create function public.finish_staff_invite(p_actor_id uuid, p_invited_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.staff_members where user_id = p_actor_id and role = 'owner' and active for update;
  if not found then raise exception 'Only an active platform owner may invite staff' using errcode = '42501'; end if;
  if p_invited_user_id is null or p_invited_user_id = p_actor_id then
    raise exception 'Invalid invited user' using errcode = '22023';
  end if;
  if exists (select 1 from public.staff_members where user_id = p_invited_user_id) then
    raise exception 'This user already has a staff record' using errcode = '23505';
  end if;
  insert into public.staff_members(user_id, role, active) values (p_invited_user_id, 'operator', true);
  insert into public.audit_events(actor_id, action, metadata) values
    (p_actor_id, 'staff_invited', jsonb_build_object('invited_user_id', p_invited_user_id, 'role', 'operator'));
end;
$$;

-- A file path is an immutable uid / project UUID / file UUID.ext. No updates or
-- moves are granted on storage.objects, so existing media cannot be overwritten.
create function private.allowed_object_path(p_path text, p_owner uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if p_owner is null or p_path is null or p_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$' then return false; end if;
  return split_part(p_path, '/', 1) = p_owner::text
    and exists (select 1 from public.projects p where p.id = split_part(p_path, '/', 2)::uuid and p.owner_id = p_owner);
end;
$$;

create function private.can_read_object(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.allowed_object_path(p_path, auth.uid()) or (
    private.is_staff() and exists (select 1 from public.project_files f where f.storage_path = p_path)
  );
$$;

create function private.guard_file_metadata()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_project public.projects; v_count integer; v_object jsonb; v_ext text;
begin
  if tg_op = 'INSERT' then
    select * into v_project from public.projects where id = new.project_id for update;
    if not found or v_project.owner_id <> new.owner_id then
      raise exception 'File project ownership mismatch' using errcode = '42501';
    end if;
    if not private.allowed_object_path(new.storage_path, new.owner_id)
      or split_part(new.storage_path, '/', 2) <> new.project_id::text
      or split_part(split_part(new.storage_path, '/', 3), '.', 1) <> new.id::text then
      raise exception 'Invalid file path' using errcode = '22023';
    end if;
    v_ext := split_part(new.storage_path, '.', 2);
    if not ((new.mime_type = 'image/jpeg' and v_ext in ('jpg', 'jpeg'))
      or (new.mime_type = 'image/png' and v_ext = 'png')
      or (new.mime_type = 'image/webp' and v_ext = 'webp')
      or (new.mime_type = 'application/pdf' and v_ext = 'pdf')) then
      raise exception 'File extension does not match MIME type' using errcode = '22023';
    end if;
    select o.metadata into v_object from storage.objects o where o.bucket_id = 'project-files' and o.name = new.storage_path;
    if not found then raise exception 'Upload the private file before saving its metadata' using errcode = '22023'; end if;
    if v_object->>'size' is distinct from new.size::text or v_object->>'mimetype' is distinct from new.mime_type then
      raise exception 'File metadata does not match the uploaded object' using errcode = '22023';
    end if;
    select count(*) into v_count from public.project_files where project_id = new.project_id and kind = new.kind;
    if (new.kind = 'photo' and v_count >= 8) or (new.kind = 'document' and v_count >= 10) then
      raise exception 'The project file limit has been reached' using errcode = '22023';
    end if;
    new.created_at := now();
    update public.projects set status = 'draft', review_note = '', revision = revision + 1, updated_at = now() where id = new.project_id;
    return new;
  else
    -- Caller removes the physical object first. Failure leaves the metadata in
    -- place for a retry, rather than silently leaving an inaccessible paid file.
    if exists (select 1 from storage.objects o where o.bucket_id = 'project-files' and o.name = old.storage_path) then
      raise exception 'Delete the stored file before removing its metadata' using errcode = '22023';
    end if;
    perform 1 from public.projects where id = old.project_id for update;
    update public.projects set status = 'draft', review_note = '', revision = revision + 1, updated_at = now() where id = old.project_id;
    return old;
  end if;
end;
$$;
create trigger project_files_guard before insert or delete on public.project_files for each row execute function private.guard_file_metadata();

-- Storage removal and metadata removal are separate HTTP requests. Invalidate
-- review at the first step as well, so a disconnect cannot leave missing media
-- approved. This trigger only updates our table; it never mutates storage data.
create function private.invalidate_deleted_object()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.bucket_id = 'project-files' then
    update public.projects p set status = 'draft', review_note = '',
      revision = p.revision + 1, updated_at = now()
      where exists (select 1 from public.project_files f where f.project_id = p.id and f.storage_path = old.name);
  end if;
  return old;
end;
$$;
create trigger proprieteavendre_object_deleted after delete on storage.objects
  for each row execute function private.invalidate_deleted_object();

alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.staff_members enable row level security;
alter table public.audit_events enable row level security;

create policy projects_read on public.projects for select to authenticated using (owner_id = (select auth.uid()) or (select private.is_staff()));
create policy files_read on public.project_files for select to authenticated using (owner_id = (select auth.uid()) or (select private.is_staff()));
create policy files_insert on public.project_files for insert to authenticated with check (owner_id = (select auth.uid()) and private.owns_project(project_id));
create policy files_delete on public.project_files for delete to authenticated using (owner_id = (select auth.uid()) and private.owns_project(project_id));
create policy staff_read on public.staff_members for select to authenticated using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy audit_read on public.audit_events for select to authenticated using ((select private.is_staff()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('project-files', 'project-files', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
create policy project_storage_read on storage.objects for select to authenticated using (bucket_id = 'project-files' and private.can_read_object(name));
create policy project_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'project-files' and private.allowed_object_path(name, (select auth.uid())));
create policy project_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'project-files' and private.allowed_object_path(name, (select auth.uid())));

-- No public/private listings are exposed anonymously, even after approval.
-- Publishing will need a separate, intentionally minimal listing projection.
revoke all on public.projects, public.project_files, public.staff_members, public.audit_events from anon, authenticated;
grant select on public.projects, public.staff_members, public.audit_events to authenticated;
grant select, insert, delete on public.project_files to authenticated;
grant all on public.projects, public.project_files, public.staff_members, public.audit_events to service_role;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_staff(), private.owns_project(uuid), private.allowed_object_path(text, uuid), private.can_read_object(text) to authenticated;

revoke all on function public.get_my_staff_role(), public.ensure_project(),
  public.save_project(uuid, integer, text, jsonb, text[], boolean, jsonb),
  public.submit_project(uuid, integer), public.review_project(uuid, integer, text, text),
  public.finish_staff_invite(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_my_staff_role(), public.ensure_project(),
  public.save_project(uuid, integer, text, jsonb, text[], boolean, jsonb),
  public.submit_project(uuid, integer), public.review_project(uuid, integer, text, text) to authenticated;
grant execute on function public.finish_staff_invite(uuid, uuid) to service_role;

commit;
