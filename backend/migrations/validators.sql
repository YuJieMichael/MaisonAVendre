create function workspace_private.valid_iso_date(p_value text)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if p_value is null or p_value !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  return to_char(p_value::date, 'YYYY-MM-DD') = p_value;
exception when invalid_datetime_format or datetime_field_overflow then return false;
end;
$$;

create function workspace_private.validate_project_input(p_plan text, p_details jsonb, p_services text[], p_visits jsonb)
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
  if coalesce(p_details->>'date', '') <> '' and not workspace_private.valid_iso_date(p_details->>'date') then
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
      or not workspace_private.valid_iso_date(v_visit->>'date')
      or (v_visit->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Invalid visit details' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create function workspace_private.validate_submission(p_project workspace.projects)
returns void language plpgsql stable security definer set search_path = '' as $$
declare v_details jsonb := p_project.details;
begin
  perform workspace_private.validate_project_input(p_project.plan, v_details, p_project.services, p_project.visits);
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
    select 1 from workspace.files f
    where f.project_id = p_project.id and f.kind = 'photo'
      and octet_length(f.content) = f.size
  ) then
    raise exception 'Add at least one property photo before submitting' using errcode = '22023';
  end if;
end;
$$;

