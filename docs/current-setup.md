# Development setup / Configuration locale / 本机开发配置

## English

Verified on 23 September 2026. Supabase project `usngcexxobcpjncuwaxo` (MaisonAVendre) is in Canada Central. The initial migration was applied through SQL Editor: four private business tables have RLS enabled, anonymous table reads are denied, six public RPCs exist, and `project-files` is a private bucket with a 10 MiB per-file limit.

Site URL is `http://127.0.0.1:5173/`; the exact permitted callback is `http://127.0.0.1:5173/#auth/callback`. Email confirmation, secure password changes and TOTP MFA are enabled. The local `.env.local` holds only the project URL and publishable key and is ignored by Git. Other installations must supply their own local environment file.

`invite-staff` was deployed through the Dashboard as a single-file composition of the repository's entry point and shared invitation modules. `APP_ORIGIN` is the local site URL. The legacy JWT gateway check is off; the handler verifies the Auth user, signed JWT claims, MFA and active owner membership on every invitation. An unauthenticated request was verified to return `401 authentication_required`. Redeploy from the canonical repository sources when changing this function.

The migration was **not** recorded by the CLI. Before a future `supabase db push`, compare the deployed schema and mark migration `202609230001` applied using the CLI's migration repair workflow. Do not execute the initial SQL again.

Still pending: the owner's website registration and email verification, reviewed owner-role assignment and MFA enrollment, real signed-in upload/save checks, and a production SMTP provider. No invitation emails or real customer accounts were created during configuration. The original hosted website has not been redeployed. The property catalogue is fictional and independent of private customer files.

## Français

Vérifié le 23 septembre 2026. Le projet Supabase MaisonAVendre (`usngcexxobcpjncuwaxo`) est situé au Canada Central. La migration initiale a été exécutée dans SQL Editor : quatre tables privées avec RLS, six fonctions RPC et le bucket privé `project-files` (10 Mio par fichier). Les lectures anonymes sont refusées.

L’application locale utilise `http://127.0.0.1:5173/` et le retour exact `/#auth/callback`. Confirmation du courriel, changement sécurisé du mot de passe et TOTP MFA activés. La connexion locale se trouve dans `.env.local`, ignoré par Git. Le service `invite-staff` est déployé avec une validation du compte, du JWT signé, du MFA et du rôle propriétaire ; une requête anonyme retourne 401.

La migration n’est pas enregistrée dans l’historique CLI : vérifiez le schéma et marquez `202609230001` comme appliquée avant un futur déploiement CLI. Ne relancez pas le SQL initial.

À terminer : inscription et validation du courriel du propriétaire, attribution contrôlée du rôle et MFA, essais connectés de sauvegarde et de fichiers, SMTP de production et publication du site. Aucun compte client ni courriel d’invitation créé pendant la configuration. Le catalogue reste fictif.

## 中文

2026 年 9 月 23 日已连接 MaisonAVendre 项目（`usngcexxobcpjncuwaxo`），位于加拿大中部。已建立四张启用 RLS 的业务表、六个数据库函数，以及每个文件上限 10 MiB 的私有 `project-files` 存储桶；匿名访问已验证会被拒绝。

本地地址固定为 `http://127.0.0.1:5173/`，登录回跳为 `http://127.0.0.1:5173/#auth/callback`。已开启邮箱验证、安全修改密码和验证器 MFA。连接信息只在本机 `.env.local` 中，不提交 GitHub。管理员邀请函数已部署，内置身份、签名令牌、MFA 和所有者身份校验；匿名请求返回 401。

初始化通过 SQL Editor 完成。以后使用 Supabase CLI 前，先核对云端结构，再将 `202609230001` 标记为已应用；不要重复运行初始化 SQL。

待完成：你的网站账号注册与邮箱验证、所有者授权与 MFA、登录后真实保存及上传测试，以及正式发信服务。此次配置没有创建客户账号或发送邀请邮件。原公开网站尚未重新部署；房源目录仍是明确标注的示例数据。
