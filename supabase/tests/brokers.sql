begin;
create schema test_support_brokers;
create function test_support_brokers.assert(p_result boolean, p_message text) returns void
language plpgsql as $$ begin if p_result is distinct from true then raise exception 'ASSERTION FAILED: %', p_message; end if; end $$;
create function test_support_brokers.expect_error(p_sql text, p_state text) returns void
language plpgsql as $$ begin
  begin execute p_sql;
  exception when others then if sqlstate = p_state then return; end if; raise exception 'Expected SQLSTATE %, got %', p_state, sqlstate; end;
  raise exception 'Expected SQLSTATE %, query unexpectedly succeeded', p_state;
end $$;
grant usage on schema test_support_brokers to anon, authenticated;
grant execute on all functions in schema test_support_brokers to anon, authenticated;

insert into auth.users(id,email,email_confirmed_at) values
  ('10000000-0000-4000-8000-000000000001','broker@example.test',now()),
  ('10000000-0000-4000-8000-000000000002','staff@example.test',now());
insert into public.staff_members(user_id,role) values('10000000-0000-4000-8000-000000000002','operator');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
select test_support_brokers.expect_error(
  $$select public.submit_broker_application('Agent Example','12345','Example Realty','agent@example.test','5145550123','',false)$$,'22023');
select public.submit_broker_application('Agent Example','12345','Example Realty','agent@example.test','5145550123','Serving Montréal',true);
select test_support_brokers.assert((select count(*)=1 from public.broker_applications where user_id=auth.uid() and status='pending'),'applicant can see only own pending application');
select test_support_brokers.assert((select count(*)=0 from public.get_verified_brokers()),'pending application is not public');
select test_support_brokers.expect_error('update public.broker_applications set status=''verified''','42501');
select test_support_brokers.expect_error('select public.review_broker_application((select id from public.broker_applications),0,''verified'','''')','42501');

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select test_support_brokers.assert((select count(*)=0 from public.broker_applications),'staff without step-up cannot read applications');
select test_support_brokers.expect_error('select public.review_broker_application((select id from public.broker_applications),0,''verified'','''')','42501');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
select test_support_brokers.assert((select count(*)=1 from public.broker_applications),'verified staff can review broker applications');
select test_support_brokers.expect_error('select public.review_broker_application((select id from public.broker_applications),0,''verified'','''')','22023');
select test_support_brokers.expect_error('select public.review_broker_application((select id from public.broker_applications),0,''changes_requested'','''')','22023');
select public.review_broker_application((select id from public.broker_applications),0,'changes_requested','Confirm your agency name.');
select test_support_brokers.assert((select status='changes_requested' from public.broker_applications),'admin can return application with review note');

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
select public.submit_broker_application('Agent Example','12345','Example Realty','agent@example.test','5145550123','Serving Montréal',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',true);
select test_support_brokers.expect_error('select public.review_broker_application((select id from public.broker_applications),1,''verified'',''Checked against OACIQ register.'')','40001');
select public.review_broker_application((select id from public.broker_applications),2,'verified','Checked against OACIQ register.');
select test_support_brokers.assert((select count(*)=1 from public.get_verified_brokers()),'verified and consented broker profile is public');
reset role;
select test_support_brokers.assert((select count(*)=1 from public.audit_events where action='broker_verified'),'verification is audited');
rollback;
