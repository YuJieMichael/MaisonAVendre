# Project workspace deployment

## English

### Managed website

Keep `VITE_PROJECT_API_URL` unset in `frontend/.env.local`. Use the current Supabase URL and publishable key. Existing accounts, projects, files and staff verification remain active. Migration `202609250007_multiple_projects.sql` removes the one-project-per-owner restriction, adds an owner/time index and an authenticated idempotent creation function. Row-level security stays in force. Older clients can still call `ensure_project`, which reuses the oldest project.

### Independent project service

1. Install Docker Engine with Compose on the target server.
2. Copy the root `.env.example` to `.env`. Set a long random hexadecimal `POSTGRES_PASSWORD`, existing Supabase public settings and `FRONTEND_ORIGIN` (the exact final HTTPS origin, no trailing slash). Hexadecimal avoids URL-escaping problems in the database connection string. No service-role key is needed.
3. Run `docker compose up -d --build` from the repository root. PostgreSQL initializes, the migration job runs transactionally, the API starts, then Nginx serves the frontend. Check `docker compose ps` and `docker compose logs migrate backend`.
4. The site listens at `127.0.0.1:3100` on the host. For public access, put an HTTPS reverse proxy on that server in front of port 3100. PostgreSQL and the API are not published on host ports. Add the final origin to Supabase Auth redirect URLs. Do not use localhost as the production origin.
5. Test two accounts: create two projects, upload and download private photos/documents, edit and refresh, submit for review, verify staff email and review. The second account must not access the first account's project or file links.

The Docker deployment uses the independent project API. It still requires the existing Supabase Auth, staff-verification RPC, public listing/enquiry Edge Functions and their migrations. Email delivery needs a valid configured provider/sender. A fresh Supabase project is not ready until those services are deployed. The public feature flags must only be enabled after those services work.

Files are stored transactionally as PostgreSQL binary data, maximum 10 MB each, 8 project photos and 10 documents per project. Public listing photo compression is a separate existing flow. Back up the entire PostgreSQL database, which includes private file bytes. Store backups securely and verify restoration before relying on the deployment. Never use `docker compose down -v` on a database you need to retain.

### Data migration and rollback

An independent database starts empty and does not mirror Supabase. Keep the managed website active until a deliberate migration is prepared. Export projects/file metadata through an authorized server-side process, download private objects, preserve project IDs and owner UUIDs, import projects and file bytes in transactions, compare row/file counts and checksums, and test account isolation before switching. No automatic copy or production data relocation was performed for this release. For frontend rollback, redeploy the previous Sites version; the additive multi-project API remains compatible with old clients. Do not restore the unique owner constraint once accounts contain multiple projects.

### Development without Docker

Install a PostgreSQL database and set backend environment variables using `backend/.env.example`. With those variables exported in the shell, run `npm --prefix backend run migrate`, then `npm --prefix backend start`. For Vite use `VITE_PROJECT_API_URL=http://localhost:3101/api`, and set backend `FRONTEND_ORIGIN` to the exact local Vite origin. Vite reads `frontend/.env.local`; backend reads process environment (or Node `--env-file`), never frontend secrets.

## Français

Le site hébergé garde les comptes et données Supabase. La nouvelle interface permet plusieurs projets par compte. Le déploiement Docker comprend le site, une API et PostgreSQL indépendants pour les projets et fichiers privés. L'authentification, les annonces publiques et les courriels dépendent encore des services Supabase configurés. La base Docker est initialement vide : ne basculez pas le site sans migration et vérification des données. Docker n'étant pas disponible sur le poste actuel, le démarrage réel des conteneurs reste à vérifier sur le serveur.

## 中文

现有网站：继续使用原 Supabase 账号、项目和照片，新增“项目列表 → 新建项目 → 项目详情”流程。卖法在新建项目时选择，也可在该项目编辑页调整，不再单独设置“服务模式”。

独立工程：已包含前端、项目后端、PostgreSQL、私有文件存储和 Docker 配置。准备服务器后，复制根目录 `.env.example` 为 `.env`，填写数据库密码、原 Supabase 公开连接信息和正式网址，再执行 `docker compose up -d --build`。网站默认只监听服务器本机 3100 端口，公网访问需要配置域名和 HTTPS 反向代理。

注意：独立项目数据库初始为空，不能直接切换线上接口来替代数据迁移。账号认证、公开房源、咨询和邮件仍使用现有 Supabase 服务。此电脑没有 Docker，本次验证覆盖编译、页面、数据库和接口测试，未实际启动容器。邮件发件地址仍需在邮件服务商验证和配置。
