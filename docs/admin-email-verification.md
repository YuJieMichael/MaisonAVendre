# Administrator email verification / Vérification par courriel / 管理员邮箱验证

## English

The administrator gate now uses a six-digit email challenge. This is application-level email step-up, **not Supabase AAL2 or an independent authenticator factor**. Access still requires a confirmed account and active owner/operator membership. Existing AAL2 sessions remain supported. Normal customers never gain staff access by confirming their email or using this endpoint.

Migration 004 creates a private challenge table and updates the authoritative RLS helper. Challenges are bound to the signed JWT's user and session ID and the user's current confirmed email. The Edge Function checks both getUser and cryptographically verified getClaims; caller-provided recipients are ignored. Codes are HMAC-hashed, expire after ten minutes, allow five guesses, and are consumed once. Resending invalidates the old code; limits are one send per minute and five per hour per staff account across sessions. Email verification grants thirty minutes of access for that session, revoked by expiry, email change or staff deactivation. The UI rechecks periodically; database permission checks are authoritative on every query. Invitation checks use the same grant.

### Configure delivery

1. Create/sign in to Resend. For production, verify a domain you own and choose a sender on it. For a limited owner-only test, use Resend's permitted test sender/recipient configuration; do not assume it can send to other staff.
2. In Supabase → Edge Functions → Secrets, enter `RESEND_API_KEY` and `STAFF_EMAIL_FROM` directly. Never put a secret in chat, frontend VITE variables, Git or source archives. Optional `STAFF_EMAIL_HASH_SECRET` is a separate random server secret; otherwise the server service-role key is used as the HMAC key.
3. Apply migration 004 once. Deploy `staff-email-verification` and the updated `invite-staff`. Both verify caller JWTs internally; their repository `verify_jwt=false` setting supports asymmetric Auth signing keys. Keep `APP_ORIGIN` equal to the deployed frontend origin.
4. Sign in as the owner, request a code on `/#admin`, then personally enter the code. Confirm real delivery, correct-code access, expiry and protected listing review. Do not publish the synthetic internal fixture.

Without sender credentials the function returns `email_not_configured`; it sends nothing and does not unlock access. This mail integration is separate from the ten-enquiry CSV scheduler, which remains unconfigured.

## Français

L’administration demande désormais un code reçu par courriel, sans QR code. Le code est valable dix minutes, limité à cinq essais et à cinq envois par heure. L’accès est lié à la session pendant trente minutes et réservé aux membres actifs de l’équipe. Ce contrôle applicatif n’est pas un facteur AAL2 Supabase. Configurez les secrets Resend côté serveur avant de tester un envoi réel.

## 中文

后台改用邮箱中的六位验证码，不再要求扫码。验证码十分钟有效、最多尝试五次，每小时最多发送五封，验证后当前登录可访问后台三十分钟。邮箱验证依赖邮箱安全，并不等同于独立验证器。必须先在 Supabase 服务器密钥设置中配置 Resend，实际收件与审核流程仍需本人完成验证。每十条咨询的 CSV 邮件任务另行配置。
