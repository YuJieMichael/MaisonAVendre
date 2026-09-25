create or replace function private.reject_duplicate_visit_slots()
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

create trigger projects_unique_visit_slots
before insert or update of visits on public.projects
for each row execute function private.reject_duplicate_visit_slots();
