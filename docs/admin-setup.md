# Administration and staff invitations

The application uses **TypeScript** for the browser and Supabase Edge Functions (Deno), and **PostgreSQL / SQL** for data and access-control rules. This source includes the implementation; creating a Supabase project, deploying the migration/function, and configuring email delivery are still required before real accounts can use it.

## Roles

- A customer owns their projects. Signing up never creates a staff membership.
- An active `operator` can read submitted projects, review them, and read the operation log after completing MFA.
- An active `owner` has those permissions and may invite a new `operator`.
- Staff do not need access to the Supabase dashboard, deployment secrets, or GitHub. Only the person maintaining the infrastructure should have those accounts.

The management route is `#admin`. Its login screen is only a usability guard; PostgreSQL RLS and server-side RPC checks enforce access. A direct API call does not bypass the same staff and MFA requirements. Approval marks a project as reviewed; this phase does **not** publish private customer data as a public listing.

## Configure a project

1. Apply the repository's Supabase migration before connecting the frontend. Use separate Supabase projects for development and production.
2. Configure the frontend's `VITE_SUPABASE_URL` and publishable / anon key as described in the root README. Never put a service-role or secret key in a `VITE_` variable.
3. Set Authentication → URL Configuration → Site URL to your production application URL. Add its exact `/#auth/callback` URL to the redirect allowlist. If hosted under a subdirectory, keep that path, for example `https://example.com/ProprieteAVendre/#auth/callback`.
4. Enable email confirmation, secure password changes, and TOTP MFA in Auth. Configure and test your own SMTP provider. The default invitation template must retain Supabase's `{{ .ConfirmationURL }}` link so Auth verifies the invitation before returning a session to the app. Do not replace it with a direct dashboard link.
5. Set the Edge Function secret `APP_ORIGIN` to the application base URL, including its subdirectory when applicable, with no query or fragment. Example: `https://example.com/ProprieteAVendre/`. This value determines the allowed CORS origin and invitation redirect; callers cannot choose another redirect.
6. Deploy `invite-staff`. Its `verify_jwt = false` setting is intentional for compatibility with asymmetric signing keys: the handler itself calls `auth.getUser(token)` **and** `auth.getClaims(token)`, validates verified `aal2` claims, and checks a live active owner membership. Do not remove those checks. Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in hosted functions; `SUPABASE_SECRET_KEY` is also supported by the handler as a fallback. No secret is sent to the frontend.

Typical deployment commands, executed by the infrastructure owner:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set APP_ORIGIN=https://YOUR_APP_DOMAIN
supabase functions deploy invite-staff
```

The repository `supabase/config.toml` is a **local development** configuration. Configure the production URLs, email delivery, and MFA in your hosted Supabase project as well. Local Auth confirmation emails are visible in the local Inbucket mailbox; a local SMTP test is not proof of production email delivery.

## Assign the first owner

There is no default administrator, hard-coded owner email, or public owner-registration form.

1. Register your own account through the website and verify its email.
2. In the Supabase dashboard, open Authentication → Users and verify the account and its UUID. Confirm the email belongs to the platform owner.
3. The infrastructure owner runs the following once in the SQL editor. Replace `REPLACE_WITH_VERIFIED_USER_UUID` with the verified UUID; the placeholder intentionally fails if left unchanged.

```sql
begin;
do $$
declare
  target_id uuid := 'REPLACE_WITH_VERIFIED_USER_UUID'::uuid;
begin
  if not exists (
    select 1 from auth.users
    where id = target_id and email_confirmed_at is not null
  ) then
    raise exception 'A verified account is required';
  end if;

  if exists (select 1 from public.staff_members where role = 'owner' and active) then
    raise exception 'An owner already exists; use a separately reviewed ownership-change procedure';
  end if;

  insert into public.staff_members (user_id, role, active)
  values (target_id, 'owner', true)
  on conflict (user_id) do update set role = 'owner', active = true;

  insert into public.audit_events (actor_id, action, metadata)
  values (target_id, 'staff_assigned', jsonb_build_object(
    'assigned_user_id', target_id, 'role', 'owner', 'method', 'infrastructure_bootstrap'
  ));
end $$;
commit;
```

4. Sign in again, open `#admin`, and enroll an authenticator app. Complete the six-digit MFA challenge. Only an `aal2` session can access management data. Store your authenticator recovery arrangements securely; recovery is an infrastructure-owner process, not a public role-escalation route.

## Invite an operator

The owner opens `#admin` → **Invite a member** and supplies a new work email address. The Edge Function validates the owner and MFA, sends an Auth invitation, and atomically creates the operator membership and audit record through `finish_staff_invite`. The invitee accepts the email, sets a password, enrolls their own authenticator, and completes MFA before viewing any customer data.

Invitations support **new accounts only**. The UI does not allow inviting another owner or promoting an existing customer account. If invitation delivery or assignment fails, the interface reports failure. An email may have been sent before a database failure; the recipient has no new staff privileges unless the assignment transaction succeeds. Never treat an invitation email alone as proof that staff access exists. Diagnose the request ID and Edge Function logs through the infrastructure owner, and inspect `staff_members` before retrying. The app deliberately does not delete an Auth account as rollback.

## Assign an already-registered operator

For an existing account, the infrastructure owner first independently verifies the owner's request, the email, and the target UUID. Run this explicit assignment in the SQL editor; it cannot create another owner or downgrade an existing owner. Both accounts must be real and email-verified.

```sql
begin;
do $$
declare
  requesting_owner uuid := 'REPLACE_WITH_EXISTING_OWNER_UUID'::uuid;
  target_id uuid := 'REPLACE_WITH_VERIFIED_OPERATOR_UUID'::uuid;
begin
  if requesting_owner = target_id
    or not exists (select 1 from public.staff_members where user_id = requesting_owner and role = 'owner' and active)
    or not exists (select 1 from auth.users where id = target_id and email_confirmed_at is not null)
    or exists (select 1 from public.staff_members where user_id = target_id and role = 'owner')
  then
    raise exception 'Assignment prerequisites not met';
  end if;

  insert into public.staff_members (user_id, role, active)
  values (target_id, 'operator', true)
  on conflict (user_id) do update set role = 'operator', active = true;

  insert into public.audit_events (actor_id, action, metadata)
  values (requesting_owner, 'staff_assigned', jsonb_build_object(
    'assigned_user_id', target_id, 'role', 'operator', 'method', 'infrastructure_assignment'
  ));
end $$;
commit;
```

Staff removal in this phase is also an infrastructure-owner operation: set the target membership's `active` to `false`, record the decision in `audit_events`, and revoke that user's Auth sessions if necessary. Never disable the only owner without a verified recovery or replacement plan. Membership is checked against the live database; changing a browser profile or user metadata cannot restore access.

## Verify before production

- A signed-out visitor, a customer, inactive staff, and staff with only `aal1` cannot read submitted projects or audit records and cannot review or invite.
- An active operator with `aal2` can review a submitted project but cannot invite staff.
- An owner with `aal2` can invite only the `operator` role. Wrong-origin requests, unverified JWTs, and forged `aal2` text are rejected.
- Review requires the expected revision, submitted status, and (for approval) completed details plus a saved photo. A stale revision fails and the UI reloads the queue. Returning a project requires an explanation.
- Private file links expire after 60 seconds; file authorization remains enforced by storage RLS when generating them.
- Verify email delivery, a real invitation/password/MFA cycle, audit events, backups, and restoration using your configured staging project before accepting customer data.

Official references: [JWT verification](https://supabase.com/docs/reference/javascript/auth-getclaims), [staff invitation API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
