begin;
do $$
declare i integer; k uuid; b jsonb; b2 jsonb; n integer; payload jsonb;
begin
  if has_table_privilege('anon','public.enquiries','select') or has_table_privilege('authenticated','public.enquiries','select')
    or has_function_privilege('anon','public.collect_enquiry(uuid,jsonb,text)','execute')
    or has_function_privilege('authenticated','public.claim_enquiry_batch()','execute') then raise exception 'inbox exposed'; end if;
  for i in 1..9 loop
    k=gen_random_uuid(); payload=jsonb_build_object('kind',case when i%2=0 then 'buyer' else 'seller' end,'name','Test','email','test@example.com');
    perform public.collect_enquiry(k,payload,lpad(i::text,64,'0'));
    perform public.collect_enquiry(k,payload,lpad(i::text,64,'0'));
  end loop;
  if public.claim_enquiry_batch() is not null then raise exception 'sent fewer than ten'; end if;
  select count(*) into n from public.enquiries;
  if n<>9 then raise exception 'retry duplicated entry'; end if;
  perform public.collect_enquiry(gen_random_uuid(),payload,repeat('a',64));
  b=public.claim_enquiry_batch();
  if b is null or jsonb_array_length(b->'rows')<>10 then raise exception 'wrong batch size'; end if;
  if public.claim_enquiry_batch() is not null then raise exception 'active batch claimed twice'; end if;
  update public.enquiry_batches set lease_until=now()-interval '1 minute' where id=(b->>'id')::uuid;
  b2=public.claim_enquiry_batch();
  if b2<>b then raise exception 'retry changed batch or rows'; end if;
  perform public.complete_enquiry_batch((b->>'id')::uuid,'provider-test');
  perform public.collect_enquiry(gen_random_uuid(),payload,repeat('b',64));
  if public.claim_enquiry_batch() is not null then raise exception 'remainder sent too soon'; end if;
  for i in 1..5 loop perform public.collect_enquiry(gen_random_uuid(),payload,repeat('c',64)); end loop;
  begin
    perform public.collect_enquiry(gen_random_uuid(),payload,repeat('c',64));
    raise exception 'rate limit bypassed';
  exception when raise_exception then
    if sqlerrm <> 'rate_limit' then raise; end if;
  end;
end $$;
rollback;
