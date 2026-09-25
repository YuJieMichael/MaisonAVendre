begin;
alter table public.projects drop constraint projects_owner_id_key;
create index projects_owner_updated_idx on public.projects(owner_id, updated_at desc, id);

-- Compatibility for older clients: reuse the oldest project, never duplicate it.
create or replace function public.ensure_project()
returns public.projects language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_project public.projects;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  select * into v_project from public.projects where owner_id = v_uid order by created_at, id limit 1;
  if not found then insert into public.projects(owner_id) values(v_uid) returning * into v_project; end if;
  return v_project;
end;
$$;

-- The client creates an idempotency ID before the request and retains it on retry.
create function public.create_project(p_id uuid, p_address text, p_city text, p_plan text)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.require_user(); v_project public.projects;
begin
  if p_id is null or p_address is null or p_city is null or char_length(btrim(p_address)) < 3
    or char_length(btrim(p_city)) < 2 then raise exception 'VALIDATION' using errcode='22023'; end if;
  perform private.validate_project_input(p_plan,jsonb_build_object('address',btrim(p_address),'city',btrim(p_city)), '{}'::text[], '[]'::jsonb);
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
  select * into v_project from public.projects where id=p_id;
  if found then
    if v_project.owner_id <> v_uid then raise exception 'Access denied' using errcode='42501'; end if;
    return v_project;
  end if;
  if (select count(*) from public.projects where owner_id=v_uid)>=100 then raise exception 'PROJECT_LIMIT' using errcode='22023'; end if;
  insert into public.projects(id,owner_id,plan,details) values(p_id,v_uid,p_plan,jsonb_build_object('address',btrim(p_address),'city',btrim(p_city))) returning * into v_project;
  return v_project;
end;
$$;
revoke all on function public.create_project(uuid,text,text,text) from public,anon;
grant execute on function public.create_project(uuid,text,text,text) to authenticated;
commit;
