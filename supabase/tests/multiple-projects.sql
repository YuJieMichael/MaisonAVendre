begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','multi-a@example.test',now()),
 ('10000000-0000-4000-8000-000000000002','multi-b@example.test',now());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.create_project('20000000-0000-4000-8000-000000000001','100 Rue Test','Montréal','without');
select public.create_project('20000000-0000-4000-8000-000000000001','100 Rue Test','Montréal','without');
select public.create_project('20000000-0000-4000-8000-000000000002','200 Rue Test','Québec','with');
do $$begin
 if (select count(*) from public.projects)<>2 then raise exception 'Multi-project or retry failed'; end if;
 if (public.ensure_project()).id not in ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002') then raise exception 'Compatibility created extra project'; end if;
end$$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.projects)<>0 then raise exception 'Cross-owner project visibility'; end if;
 begin
  perform public.create_project('20000000-0000-4000-8000-000000000001','Hijack','Québec','with');
  raise exception 'ID hijack allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.save_project('20000000-0000-4000-8000-000000000001',0,'with','{}','{}',false,'[]');
  raise exception 'Cross-owner write allowed';
 exception when insufficient_privilege then null; end;
end$$;
rollback;
