-- Limit password-only access to explicitly allowlisted, confirmed owner accounts.
-- Keep account identifiers in the private database, not in the source repository.
create table if not exists private.staff_password_access_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.staff_password_access_users enable row level security;
revoke all on table private.staff_password_access_users from public, anon, authenticated;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.staff_members s
    join auth.users u on u.id = s.user_id
    where s.user_id = auth.uid()
      and s.active
      and s.role = 'owner'
      and u.email_confirmed_at is not null
      and exists (
        select 1 from private.staff_password_access_users a
        where a.user_id = s.user_id
      )
  )
  or (
    exists (
      select 1 from public.staff_members s
      where s.user_id = auth.uid() and s.active
    )
    and (
      coalesce(auth.jwt()->>'aal' = 'aal2', false)
      or public.check_staff_email_session(auth.uid(), auth.jwt()->>'session_id')
    )
  );
$$;
