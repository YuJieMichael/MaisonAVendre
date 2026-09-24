# Propriété En Vente 后端接入指南

当前仓库包含可部署的后端实现，但尚未填入真实 Supabase 项目的连接信息，也不代表云端已经部署完成。组织页面地址不能用于连接数据库；需要先在组织内创建一个 **Project（项目）**。

后端使用 **TypeScript + Supabase Edge Functions（Deno）**，数据库和权限规则使用 **PostgreSQL / SQL**。前端继续使用 React + TypeScript。

## 1. 在自己的账号下建立项目

1. 登录 [Supabase 控制台](https://supabase.com/dashboard)，进入自己的组织，选择 **New project**。
2. 在免费组织/方案下创建初期测试项目，例如 `propriete-en-vente-test`。创建页面如显示付费升级或额外费用，先确认所选方案，不要把本指南理解为购买授权。
3. 设置并安全保存数据库密码。该密码不需要填进网页，也不要发送到聊天或提交到 GitHub。
4. 如果页面提供具体区域，优先选 **Canada (Central) / `ca-central-1`**。如果只显示大区，查看是否可切换具体区域；仅选 Americas 不代表位于加拿大。[区域说明](https://supabase.com/docs/guides/platform/regions)
5. 等待项目建立完成，记录项目设置里的 **Project ID / Reference ID**。也可在项目地址 `https://supabase.com/dashboard/project/PROJECT_REF` 中识别它。`/org/...` 地址内的组织 ID，以及仓库 `supabase/config.toml` 中的本地名称 `propriete-en-vente`，都不是云端项目 ID。

建议先用测试项目验证完整流程，再为真实客户建立独立生产项目。创建免费项目只是开始；存储用量、邮件服务、备份与后续方案以控制台当前显示为准。

## 2. 创建数据库、权限和私有存储桶

迁移文件是 [`supabase/migrations/202609230001_initial_backend.sql`](../supabase/migrations/202609230001_initial_backend.sql)。它创建：

- 私有卖房项目 `projects`，每个客户一个项目。
- 文件记录 `project_files` 和私有 `project-files` 存储桶。
- 平台所有者/运营人员权限 `staff_members`。
- 审核及管理员邀请记录 `audit_events`。
- 保存、提交审核、审核和邀请事务的服务器函数，以及行级访问权限。

**方式 A：命令行部署（推荐，自动记录迁移历史）**

在本仓库根目录运行。需要 Node.js 和 npm；首次 `npx` 会提示安装 Supabase CLI。

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

把 `YOUR_PROJECT_REF` 换成刚才创建的项目 ID。CLI 需要的登录或数据库密码由你在其交互流程中输入，不写进项目源码。

**方式 B：新项目的 SQL Editor**

如果暂时不使用 CLI，可以在该项目的 SQL Editor 新建查询，复制完整迁移文件并执行一次。此方式适用于尚未建立这些表的新项目，不要重复执行，也不要粘贴 `supabase/tests` 下的测试 SQL。

两种方式选一种。用 SQL Editor 成功执行后，如果将来改用 CLI，维护者应先核对数据库确实与迁移一致，再把 `202609230001` 标记为已应用；不要直接再次 `db push` 让同一迁移重复建表。

执行后应能看到上述四张业务表。Storage 中 `project-files` 必须保持 **Private**，每个文件上限 10 MiB，允许 JPEG、PNG、WebP、PDF。不要为解决访问错误把桶改为 Public，或关闭表的 RLS。

完整字段和 RPC 契约见[数据库说明](../supabase/docs/database-contract.md)。数据库测试使用的 `bootstrap.sql` 只适用于临时测试数据库，**不能部署到 Supabase**。

## 3. 设置账号、邮件与回跳地址

在托管项目的 Authentication 设置中：

1. 启用 Email / Password 注册和 **Confirm email**。卖家保存项目前必须验证邮箱。
2. 启用安全密码修改和 TOTP MFA。管理员必须通过验证器完成双重验证。
3. 在 **URL Configuration** 设置实际网页的 **Site URL**，并添加精确的回跳地址。开发阶段例如：

| 用途 | Site URL / 允许的回跳地址 |
| --- | --- |
| Vite 本地网页 | `http://127.0.0.1:5173/` |
| 本地注册、找回密码、邀请回跳 | `http://127.0.0.1:5173/#auth/callback` |
| 正式网站示例 | `https://your-domain.example/` |
| 正式回跳示例 | `https://your-domain.example/#auth/callback` |

以 Vite 实际显示的地址为准：`localhost`、`127.0.0.1` 和不同端口需要分别配置。如果网页位于子目录，例如 `/propriete-en-vente/`，Site URL 与回跳地址都必须保留该路径。正式环境使用明确地址，不配置任意站点通配符。[回跳地址说明](https://supabase.com/docs/guides/auth/redirect-urls)

确认、找回密码和邀请邮件模板应保留 Supabase 的验证链接 `{{ .ConfirmationURL }}`，不要改成普通工作台链接。注册及密码重置采用纯前端邮件流程（implicit），Supabase 验证邮件后返回登录状态，由 AuthProvider 验证并清除地址栏中的令牌；不依赖原浏览器的 PKCE 临时凭据。旧 PKCE 链接保留兼容处理，但缺少原凭据时需重新申请新邮件。

Supabase 默认发信服务主要用于测试，收件人受到限制，通常只能发送给组织团队中的邮箱。真实客户注册和邀请需要配置自己的 SMTP、发件人域名及邮件服务；不要为了收到邮件把客户加成 Supabase 组织成员，也不要关闭邮箱验证来绕过发信问题。[SMTP 说明](https://supabase.com/docs/guides/auth/auth-smtp)

仓库里的 `supabase/config.toml` 是本地开发配置。它不会自动把托管项目的 URL、SMTP 和 MFA 设置好。

## 4. 把网页连接到项目

在 Supabase 项目的 **Connect** 或 **Settings → API Keys** 中找到项目 URL 和 **Publishable key**。公开密钥通常以 `sb_publishable_` 开头，它用于识别网页，具体数据访问仍由登录身份和 RLS 决定。[API 密钥说明](https://supabase.com/docs/guides/api/api-keys)

在仓库根目录新建 `.env.local`，按照 `.env.example` 填写：

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_WITH_YOUR_PUBLIC_KEY
```

只填写这两项。**不要把 `sb_secret_...`、`service_role`、数据库密码或个人访问令牌放进任何 `VITE_` 变量。** `VITE_` 内容会进入浏览器代码。`.env.local` 已被 Git 忽略，不需要提交。

安装依赖并运行：

```sh
npm ci
npm run dev
```

修改 `.env.local` 后重新启动 Vite。发布静态网站时，也要在托管平台的构建环境里设置这两个公开变量，然后重新构建：

```sh
npm run build
```

最终部署整个 `dist/` 目录到你实际控制的静态网站托管服务。仅把代码上传到 GitHub，或在已构建文件旁放 `.env.local`，都不会让线上网页自动连接后端。原有 `chatgpt.site` 网站也不会因此自动更新。

没有有效连接信息时，网页会显示账号服务尚未配置，并提供明确标记的示例工作台；不会假装建立账号或把演示保存当作云端成功。

## 5. 部署员工邀请服务

卖家登录、保存、上传和审核主要通过 Supabase Auth、受权限限制的数据库 RPC 及 Storage 完成。邀请新运营人员额外使用服务器端 `invite-staff` Edge Function。

在仓库根目录执行，先确保已通过 CLI 登录并链接正确项目：

```sh
npx supabase secrets set APP_ORIGIN=https://YOUR_APP_DOMAIN/
npx supabase functions deploy invite-staff
```

把 `APP_ORIGIN` 换成网页的真实基础 URL。开发测试可用 `http://127.0.0.1:5173/`；部署在子目录时例如 `https://your-domain.example/propriete-en-vente/`。不要加 `#admin` 或查询参数。它决定邀请邮件回跳和允许的浏览器来源；本实现每个环境配置一个基础 URL。

`invite-staff` 的 `verify_jwt = false` 是当前实现的明确配置：函数内部仍然逐次校验真实用户、经过验证的 JWT 声明、`aal2` MFA 和数据库中的 active owner。不要删除这些校验，也不要把它当成匿名邀请接口。[Edge 部署说明](https://supabase.com/docs/guides/functions/deploy)

当前函数读取托管运行环境注入的 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`，代码也支持服务器侧 `SUPABASE_SECRET_KEY` 回退。服务器密钥仅用于函数内部。若项目更改了密钥体系，需要由维护者核对运行环境，不应把服务器密钥复制进网页或发给普通管理员。

## 6. 建立你的所有者账号

1. 先通过网页注册你自己的账号并验证邮箱。
2. 在 Supabase 的 Authentication → Users 核对你的 UUID。
3. 按[管理员设置说明中的首次所有者步骤](admin-setup.md#assign-the-first-owner)，由基础设施维护者执行一次受保护的 SQL 授权。
4. 重新登录网页，打开 `/#admin`，配置验证器并完成双重验证。
5. 之后由你在管理后台邀请运营人员。普通注册不会获得管理员权限，运营人员也不需要 Supabase 控制台账号。

没有默认管理员密码，也没有隐藏的通用账号。所有者邀请、已有账号授权、停用员工等说明见 [admin-setup.md](admin-setup.md)。

## 7. 验证代码和实际服务

无需真实 Supabase 项目即可运行代码侧检查：

```sh
npm run build
node supabase/tests/run-database.mjs
node --experimental-strip-types --test supabase/functions/_shared/invitation.test.ts
npx vitest run tests/auth.test.tsx --configLoader native
```

数据库测试运行临时 PGlite 数据库，不连接云端、不改动真实客户数据。邀请测试使用模拟依赖，不发送邀请邮件。Auth 测试使用模拟身份服务，不创建真实账号。通过这些检查不等于已验证实际邮件和云端配置。

连接测试项目后，再用自己的测试账号完成：

- 注册 → 验证邮箱 → 登录 → 找回密码；检查无效/过期邮件链接会显示失败。
- 保存房屋资料、选择服务、上传/删除照片和文档；刷新或退出后重新登录，确认资料仍在。
- 使用第二个客户账号，确认看不到第一个账号的项目和文件。
- 完成资料、上传至少一张照片、提交审核；管理员通过 MFA 后批准或退回，并产生审计记录。
- 修改已审核资料或删除照片，确认状态回到草稿；两个标签页同时编辑时应提示冲突，不能悄悄覆盖。
- 所有者邀请运营人员，走完邮件激活、设置密码及 MFA；普通客户和未完成 MFA 的员工不能进入管理数据。

## 8. 本阶段范围与上线前工作

已实现的代码包括账号、私有项目持久保存、私有文件、受邀管理员、MFA 权限、内部审核与审计。正式接收客户之前，仍需完成上述真实环境验证、SMTP、实际网页部署、数据库和文件备份及恢复演练、错误监控，以及公司的隐私政策、服务条款和身份资料。

**本阶段不包含付款、确认预约、公开房源发布、真实买家询盘或交易报价系统。** 服务选择表示意向，审核通过表示资料已审核，不会自动公开客户的联系方式和私人文件。公开房源需要另建经过筛选的公开数据结构，不能直接开放 `projects` 表。

客户工作室账号与 Supabase 项目管理账号不同。日常运营在 `/#admin` 完成；基础设施账号和服务器密钥由平台所有者及维护人员保管。
