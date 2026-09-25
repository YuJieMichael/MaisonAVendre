# Buyer / seller enquiries — pending activation

English: Public buyer and seller forms require name and email only. No login is needed. Contact information is private; enquiries are combined into FIFO batches of exactly 10, checked every 5 minutes once the scheduler is configured. Remainders wait for the next batch. Each CSV goes only to `achat.vente.garderie@gmail.com`. Provider acceptance is recorded separately from form collection; it does not prove Gmail inbox delivery.

Français : Les formulaires d’achat et de vente exigent uniquement le nom et le courriel, sans connexion. Les demandes sont regroupées par lots de 10 et envoyées dans un fichier CSV à l’adresse ci-dessus. Les demandes restantes attendent le prochain lot. La collecte et l’acceptation par le service de courriel sont distinctes.

中文：买卖表单仅姓名、邮箱必填，不需要登录。买卖合计满 10 条组成一批，配置后每 5 分钟检查一次，每次发送一批 CSV 到指定邮箱；不足 10 条继续等待。表单保存成功不等于邮件已送达 Gmail。

## Current status / État actuel / 当前状态

Migration 002 is applied to `usngcexxobcpjncuwaxo` and `submit-enquiry` is deployed. Unauthenticated requests with the browser publishable key reach application validation; the existing gateway setting was retained. Approved-origin invalid payloads return 400, other origins return 403, and anonymous private-table reads are denied. Collection is enabled in this machine's deployment build; no production fake leads were submitted. A positive real-user save remains to be checked. The scheduler, `send-enquiry-batches`, Resend credentials and verified sender are still pending. No automated CSV emails are being sent. User deferred Resend setup. Collection and email delivery can be activated separately.

## Activation

1. Create Resend account, verify a sending domain/address, and store a sending API key as Supabase Edge Function secret `RESEND_API_KEY`. Never use a `VITE_` prefix for server secrets. The receiving Gmail address is not a sending-domain credential.
2. Migration 002 is already applied through SQL Editor to the existing project, alongside 001 and 003. Reconcile CLI history before using `db push`; do not replay these migrations.
3. Set Edge secrets `ENQUIRY_EMAIL_FROM` (verified sender), `ENQUIRY_RATE_SALT` (random secret), `ENQUIRY_CRON_TOKEN` (separate random secret), and `APP_ORIGIN` (actual website origin). Built-in Supabase service-role credentials stay server-side.
4. Deploy `submit-enquiry` and `send-enquiry-batches` using repository config. Public intake validates size, required fields, origin, honeypot and rate limits (5 per client/15 min; 1000 globally/day). Verify the hosting gateway's trusted client-IP forwarding before production; CORS is not an anti-bot guarantee. Consider CAPTCHA if abuse requires it.
5. Enable Supabase Cron/pg_net and Vault. Store the cron token in Vault as `enquiry_cron_token`, then run `supabase/schedule-enquiry-batches.sql`. The worker requires this token, never the public browser key.
6. Test on staging with 9 entries (no batch), a 10th (one CSV), and an 11th (one pending). Verify the intended Gmail inbox, retries and RLS. Test provider calls with test credentials; do not populate production with fake leads.
7. Set `VITE_ENQUIRY_ENABLED=true`, rebuild and deploy the frontend. Configure a production origin before enabling real visitors. Publish finalized company/privacy contact details and decide retention before collecting real customer data.

The worker uses atomic database claims, a 5-minute lease and stable provider idempotency keys. Failed attempts preserve their batch. After 23 hours of uncertain delivery a batch is marked `needs_review` rather than risking a duplicate after Resend's 24-hour idempotency window. Inspect provider records by batch ID; reconcile `provider_id`/`sent_at` before any manual retry. No personal information is logged by the handlers. Customer roles cannot read the inbox tables; only the server and database administrator can access them. CSV cells neutralize spreadsheet formulas and preserve UTF-8 Chinese/French.

References: [Resend email API](https://resend.com/docs/api-reference/emails/send-email), [Supabase scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions).

## Optional preferences

English: Hybrid sellers can select photography, video, listing presentation, price analysis, viewings and offer support, or choose unsure. Both buyer and seller forms offer contact language, method and availability. These remain optional and are included in validated enquiry payloads and CSV exports. The comparison describes proposed collaboration; scope and fees are agreed before commitment.

Français : Les vendeurs en mode collaboratif choisissent les aides souhaitées. Les préférences de langue, de contact et de disponibilité restent facultatives et sont incluses dans les fichiers CSV.

中文：协作卖房可多选所需帮助，也可选择暂时不确定。买卖表单均有联系语言、方式与方便联系时间，全部选填，并纳入汇总 CSV。收集和发送仍待配置后启用。
