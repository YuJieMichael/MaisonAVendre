# Connected environment / Environnement connecté / 连接状态

Updated 23 September 2026.

## English

Supabase project MaisonAVendre (usngcexxobcpjncuwaxo) is in Canada Central. Migrations 001, 002 and 003 were applied manually using SQL Editor. Reconcile the schema and repair CLI migration history before db push; do not replay these migrations. The enquiry and listing tables have RLS. Both project-files and listing-photos buckets are private. Anonymous HTTP checks can read only the public catalogue; private enquiry and submission reads are denied.

The new Sites project is recorded in .openai/hosting.json and starts owner-private. Its configured origin is https://maisonavendre-quebec.achat-vente-garderie.chatgpt.site. This is also Supabase APP_ORIGIN and Auth Site URL. Exact /#auth/callback redirects are configured for this origin and http://127.0.0.1:5173. The original maisonavendre.xieyujieee.chatgpt.site site is unchanged. Sites confirmed successful deployment on 23 September 2026. The final URL differs from the initial provisional URL; use the final origin above.

invite-staff, submit-enquiry and submit-listing are deployed. Public intake requests using the publishable API key reach validation without a user session; invalid input returns 400 and disallowed origins return 403. No default gateway switch was changed for these new intake functions. invite-staff retains its own signed identity, confirmed email, active owner and MFA checks. Browser environment files contain only public project settings and feature flags and are not committed.

Enquiry collection is enabled for this deployment build. CSV email delivery remains disabled pending Resend sender credentials and the scheduled worker. Listing submission stays in preview until owner registration and review testing are complete. The intended owner is achat.vente.garderie@gmail.com; this website account was not registered at the last check. Registration, email verification, explicit owner assignment and TOTP enrollment remain to be completed by/with the user. No real or fake production leads/listings have been created during setup. A positive real enquiry save and an actual photo upload/review/unpublish cycle remain unverified. Catalogue examples are clearly fictional.

## Français

Les migrations 001–003 sont appliquées. Les données privées et les photos sont protégées. Les fonctions de collecte sont déployées et la collecte des demandes est activée dans cette version. L’envoi des lots CSV attend Resend. Le dépôt d’annonces reste en aperçu jusqu’à la création du compte administrateur et aux essais de validation avec MFA. Le nouveau site commence en accès privé; l’ancien site reste inchangé.

## 中文

数据库迁移 001–003、咨询和房源接口已部署，私人资料与照片受权限保护。当前构建启用买卖咨询收集；满 10 条发送邮件仍待 Resend 配置。卖家房源提交暂保留预览，需先完成管理员注册、邮箱验证、授权与双重验证，再测试审核发布。新网站初始为仅所有者访问，原网址未修改。尚未用真实客户信息测试保存，也未完成真实照片上传及审核全流程。
