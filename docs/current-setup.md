# Connected environment / Environnement connecté / 连接状态

Updated 24 September 2026.

## English

Supabase project ProprieteAVendre (usngcexxobcpjncuwaxo) is in Canada Central. Migrations 001, 002, 003 and 004 were applied manually using SQL Editor. Reconcile the schema and repair CLI migration history before db push; do not replay these migrations. The enquiry and listing tables have RLS. Both project-files and listing-photos buckets are private. Anonymous HTTP checks can read only the public catalogue; private enquiry and submission reads are denied.

The Sites project is recorded in .openai/hosting.json and remains owner-private. Its configured origin is https://proprieteavendre-quebec.achat-vente-garderie.chatgpt.site. This is also Supabase APP_ORIGIN and Auth Site URL. Exact /#auth/callback redirects are configured for this origin and http://127.0.0.1:5173. The predecessor site at https://maisonavendre.xieyujieee.chatgpt.site is unchanged. The renamed ProprieteAVendre build was deployed successfully on 24 September 2026.

invite-staff, submit-enquiry, submit-listing and staff-email-verification are deployed. Public intake requests using the publishable API key reach validation without a user session; invalid input returns 400 and disallowed origins return 403. No default gateway switch was changed for these new intake functions. invite-staff retains its own signed identity, confirmed email, active owner and server-verified email-session (or existing AAL2) checks. Browser environment files contain only public project settings and feature flags and are not committed.

Enquiry collection is enabled for this deployment build. CSV email delivery remains disabled pending Resend sender credentials and the scheduled worker. Listing submission and database-only public catalogue are enabled for this deployment. The verified website account achat.vente.garderie@gmail.com now has explicitly approved active owner membership. The user approved changing the admin gate to session-scoped email verification; migration 004 is applied. The Resend team is named ProprieteAVendre, but a sender domain and server credentials are still needed; see docs/admin-email-verification.md. One labelled, synthetic internal listing with a test PNG was saved successfully through the real endpoint; retry was idempotent and anonymous photo signing was denied. It remains pending and unpublished. Two seller enquiries were verified in the live database (latest 2026-09-23 18:55:51 UTC). Real email-code delivery and an authenticated review/unpublish cycle remain unverified. Live catalogue/homepage use only approved database rows; fictional examples remain available only when live mode is disabled.

## Français

Les migrations 001–004 sont appliquées. Les données privées et les photos sont protégées. Les fonctions de collecte sont déployées et la collecte des demandes est activée dans cette version. L’envoi des lots CSV attend Resend. Le dépôt d’annonces est activé, le rôle propriétaire est attribué et le catalogue lit les données approuvées. La validation par code courriel attend les secrets Resend. Le nouveau site commence en accès privé; l’ancien site reste inchangé.

## 中文

数据库迁移 001–004、咨询和房源接口已部署，私人资料与照片受权限保护。当前构建启用买卖咨询收集；满 10 条发送邮件仍待 Resend 配置。房源提交已启用，正式目录只展示数据库中已审核的房源。管理员已注册、验证并获所有者权限，已按本人确认改用邮箱验证码，仍需配置 Resend 后完成验证。内部测试房源及照片已真实保存、保持未公开，正式审核全流程待验证。新网站初始为仅所有者访问，原网址未修改。数据库已核对收到两条卖房咨询；测试照片上传已成功，审核发布全流程待验证。

Buyer inbox: migration 005 was applied after explicit approval. Verified staff can read buyer enquiries individually through a read-only paginated RPC; direct table access remains revoked. The ten-enquiry email batch workflow is unchanged. / Administration : demandes d’achat individuelles. / 后台买家咨询逐条可查，邮件仍按十条汇总。
