-- Email step-up is a session-scoped application permission, not Supabase AAL2.
begin;
create table private.staff_email_checks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id text not null,
  email text not null,
  code_hash text,
  challenge_id uuid,
  expires_at timestamptz,
  attempts integer not null default 0,
  last_sent_at timestamptz,
  window_start timestamptz not null default now(),
  send_count integer not null default 0,
  verified_until timestamptz
);
alter table private.staff_email_checks enable row level security;
revoke all on private.staff_email_checks from public, anon, authenticated;

create function public.check_staff_email_session(p_user_id uuid, p_session_id text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from private.staff_email_checks c
    join public.staff_members s on s.user_id=c.user_id and s.active
    join auth.users u on u.id=c.user_id and u.email_confirmed_at is not null
    where c.user_id=p_user_id and c.session_id=p_session_id
      and c.email=lower(u.email) and c.verified_until>now()
  );
$$;
revoke all on function public.check_staff_email_session(uuid,text) from public, anon, authenticated;
grant execute on function public.check_staff_email_session(uuid,text) to service_role;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.staff_members s where s.user_id=auth.uid() and s.active)
    and (coalesce(auth.jwt()->>'aal'='aal2',false)
      or public.check_staff_email_session(auth.uid(),auth.jwt()->>'session_id'));
$$;

create function public.get_my_staff_access()
returns boolean language sql stable security definer set search_path='' as $$
  select private.is_staff();
$$;
revoke all on function public.get_my_staff_access() from public, anon;
grant execute on function public.get_my_staff_access() to authenticated;

-- Only a trusted Edge Function may issue or check challenges. No browser-supplied
-- recipient, identity or success flag is trusted. One row serializes all sessions.
create function public.begin_staff_email_check(p_user_id uuid,p_session_id text,p_hash text,p_challenge_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_email text; c private.staff_email_checks;
begin
  select lower(u.email) into v_email from auth.users u join public.staff_members s on s.user_id=u.id
    where u.id=p_user_id and u.email_confirmed_at is not null and s.active;
  if v_email is null then return 'forbidden'; end if;
  if coalesce(length(p_session_id),0)<1 or coalesce(p_hash,'') !~ '^[a-f0-9]{64}$' or p_challenge_id is null then return 'invalid'; end if;
  insert into private.staff_email_checks(user_id,session_id,email) values(p_user_id,p_session_id,v_email) on conflict do nothing;
  select * into c from private.staff_email_checks where user_id=p_user_id for update;
  if c.last_sent_at>now()-interval '60 seconds' then return 'rate_limited'; end if;
  if c.window_start>now()-interval '1 hour' and c.send_count>=5 then return 'rate_limited'; end if;
  update private.staff_email_checks set session_id=p_session_id,email=v_email,code_hash=p_hash,
    challenge_id=p_challenge_id,expires_at=now()+interval '10 minutes',attempts=0,
    last_sent_at=now(),verified_until=null,
    send_count=case when c.window_start<=now()-interval '1 hour' then 1 else c.send_count+1 end,
    window_start=case when c.window_start<=now()-interval '1 hour' then now() else c.window_start end
    where user_id=p_user_id;
  return 'ok';
end;
$$;
create function public.finish_staff_email_check(p_user_id uuid,p_session_id text,p_hash text,p_challenge_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare c private.staff_email_checks;
begin
  select * into c from private.staff_email_checks where user_id=p_user_id for update;
  if not found or c.session_id is distinct from p_session_id or c.challenge_id is distinct from p_challenge_id
    or c.code_hash is null or c.expires_at<=now() or c.attempts>=5 then return false; end if;
  if not exists(select 1 from public.staff_members s join auth.users u on s.user_id=u.id
    where s.user_id=p_user_id and s.active and u.email_confirmed_at is not null and lower(u.email)=c.email) then return false; end if;
  update private.staff_email_checks set attempts=attempts+1 where user_id=p_user_id;
  if p_hash is distinct from c.code_hash then return false; end if;
  update private.staff_email_checks set code_hash=null,verified_until=now()+interval '30 minutes' where user_id=p_user_id;
  insert into public.audit_events(actor_id,action,metadata) values(p_user_id,'staff_email_verified','{}');
  return true;
end;
$$;
revoke all on function public.begin_staff_email_check(uuid,text,text,uuid), public.finish_staff_email_check(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.begin_staff_email_check(uuid,text,text,uuid), public.finish_staff_email_check(uuid,text,text,uuid) to service_role;
commit;
