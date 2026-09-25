create or replace function workspace_private.reject_duplicate_visit_slots()
returns trigger language plpgsql set search_path = '' as $$
begin
  if jsonb_typeof(new.visits) = 'array' and exists (
    select 1
    from jsonb_array_elements(new.visits) as item(value)
    group by value->>'date', value->>'time'
    having count(*) > 1
  ) then
    raise exception 'VISIT_SLOT_TAKEN' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_unique_visit_slots on workspace.projects;
create trigger projects_unique_visit_slots
before insert or update of visits on workspace.projects
for each row execute function workspace_private.reject_duplicate_visit_slots();
