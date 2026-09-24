-- Read-only staff inbox; collection and ten-record email batching are unchanged.
create function public.list_buyer_enquiries(p_offset integer default 0)
returns table(id uuid, created_at timestamptz, payload jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_staff() then
    raise exception 'verified_staff_required' using errcode='42501';
  end if;
  if p_offset is null or p_offset<0 then raise exception 'invalid_offset'; end if;
  return query select e.id,e.created_at,e.payload from public.enquiries e
    where e.payload->>'kind'='buyer'
    order by e.created_at desc,e.id desc limit 51 offset p_offset;
end;
$$;
revoke all on function public.list_buyer_enquiries(integer) from public,anon;
grant execute on function public.list_buyer_enquiries(integer) to authenticated;
