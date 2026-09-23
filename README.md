# MaisonÀVendre

Montréal real estate homepage, trilingual seller workspace and Supabase backend built with **React, TypeScript, PostgreSQL and Supabase Edge Functions (Deno)**. Editable source code, including authentication, private project storage, access rules and a staff review interface.

产品方向：卖家自主推进，再按需要增加摄影、视频、市场分析、咨询或经纪帮助。首阶段服务区域为蒙特利尔，价格待定。

**后端源码已实现，云端仍需配置。** 尚未在此仓库填入真实项目连接信息；组织地址不能代替 Supabase 项目 ID。按照 [后端接入指南](docs/backend-setup.md) 创建项目、应用数据库迁移、配置邮件并连接网页。未配置时，真实账号入口会明确显示暂不可用。

## 本地运行 / Run locally

Windows 用户可以先看 [中文手动启动说明](docs/local-start.zh-CN.md)，包含首次安装、以后启动、停止服务和从 GitHub 更新的步骤。

Use Node.js 22.18+ or a supported newer LTS release.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. The seller journey is at `/#vendre`, the private dashboard at `/#dashboard`, and project editing at `/#vendre/edit`. Customers must sign in to use their real workspace. `/#demo` is a separate, clearly labelled example; `/#admin` is the invited staff interface.

For real account functionality, create `.env.local` using `.env.example` and supply only your Supabase project URL and browser-safe publishable key. See the [setup guide](docs/backend-setup.md). Never put a service-role/secret key in a `VITE_` variable. Restart Vite after changing environment settings.

```sh
npm run build
npm run preview
```

The build checks TypeScript and generates `dist/`. Relative asset paths support GitHub Pages repository subdirectories. Serve the entire `dist/` directory with a static host; do not open it via `file://`.

## 当前功能 / Included

- Reconstructed homepage with the existing hero image, three language dictionaries, green/gold styling, value input and buyer/seller tabs.
- French, English and Chinese switcher; changing language preserves seller inputs.
- **Avec courtier / With a broker / 有经纪服务**: broker support and fees by mandate.
- **Sans courtier / Without a broker / 无经纪自售**: professional photography, video, qualified market analysis and listing presentation.
- Register / verify email / sign in / recover password. Staff access additionally requires TOTP MFA.
- Choose service → property details → contact details and optional availability → save → seller dashboard.
- Address, city, Canadian postal-code validation, property type, desired price, existing broker and sale timeline.
- Private cloud photo storage with upload/removal; up to 8 JPG, PNG or WebP images, 10 MB per file.
- Contact details, communication language, preferred date/time, validation and editable review.
- Seller dashboard: overview, property, buyers, viewings, offers, documents, optional services and support mode.
- Clearly labelled fictional example data; the user's own unpublished project shows no invented performance figures.
- Project data, viewing notes, service interests and support preference persist in the signed-in account after a successful cloud save. Auto-save status and explicit conflict handling protect against stale browser tabs.
- Example buyer filtering/status changes and example offer details remain demo-only. Customer data has no invented enquiries or offers.
- Private document centre: up to 10 PDF/JPG/PNG/WebP files, 10 MB each, with authorized download and removal.
- Complete a project and add a photo to request internal review. Invited MFA staff may approve or request changes, with audit records. Approval does not publish private data.
- Platform owners may invite operators through a protected TypeScript Edge Function; customers cannot assign themselves staff permissions.
- Responsive layout and keyboard-accessible controls.

## 部署状态与范围 / Deployment status and boundaries

**Backend source is included; a live Supabase project, migration/function deployment, Auth/SMTP settings and a configured frontend build are still required.** This repository does not establish a production service by itself. Once connected, real customer details and files are transmitted to the private backend and remain there after refreshing. Supabase Auth persists the login session in the browser; signing out clears this device's session.

The separate `/#demo` workspace uses labelled fictional examples. Demo selections are temporary, and real uploads are unavailable there. A demonstration never substitutes for a successful server save.

- All optional service prices show **pricing to be confirmed**. Selection records service interest, not an order. Switching support records a preference, not a brokerage mandate.
- No payment processing, confirmed booking, public listing publication, real buyer account, enquiry feed or offer-submission system is implemented. Property search remains unavailable.
- The homepage contact form validates inputs but explicitly says nothing was sent.
- Brokerage and self-sale presentation services are separate. This UI is not a compliant service agreement.
- Some homepage marketing was retained from the published site. Before production, verify service claims, broker identity/licence, company information, privacy/terms and personal-data collection notices. Footer legal labels are placeholders, not completed policy pages.
- Uploading this repository does **not** update the existing `chatgpt.site` website. A frontend deployment and its build environment must be configured separately.

## 后端设置与检查 / Backend setup and checks

- [普通用户接入步骤](docs/backend-setup.md): create a Supabase project, apply SQL, configure email, set browser keys and deploy the invite function.
- [管理员设置](docs/admin-setup.md): bootstrap the verified owner account, enable MFA and invite operators.
- [数据库契约](supabase/docs/database-contract.md): tables, RPC arguments, storage rules and review transitions.

```sh
npm run build
node supabase/tests/run-database.mjs
node --experimental-strip-types --test supabase/functions/_shared/invitation.test.ts
npx vitest run tests/auth.test.tsx --configLoader native
```

Database assertions run against disposable PGlite with mocked Auth/Storage schemas. Auth and invitation tests use simulated dependencies. They do not create cloud accounts or send emails. Real email delivery, Storage upload limits and private downloads, password recovery, staff invitations and backup restoration require a configured staging smoke test. Never run `supabase/tests/bootstrap.sql` against a hosted Supabase project.

## 文件结构 / Source map

```text
src/main.tsx          Homepage, navigation, language state
src/home-copy.json    Recovered trilingual homepage text
src/seller-flow.tsx   Seller flow, form validation, private photo uploads
src/seller-copy.ts    Trilingual seller-flow text
src/auth.tsx         Account screens, sessions, email callback and staff MFA
src/project.tsx      Serialized cloud saves, media operations and demo separation
src/project-status.tsx Save/conflict state and review submission
src/lib/project-api.ts Supabase RPC and private Storage client
src/admin.tsx        Staff project review, private media and operator invitations
src/dashboard.tsx    Eight dashboard views and trilingual copy
src/dashboard.css    Responsive seller workspace styling
src/original.css      Recovered site-specific homepage styling
src/styles.css       Shared controls and responsive seller design
public/              Existing hero image and favicon
supabase/migrations/ PostgreSQL tables, RPCs, RLS and private storage policy
supabase/functions/  Server-side TypeScript staff invitation handler
supabase/tests/      Disposable database integration tests
docs/                Backend deployment and administrator setup
```

## Recovery provenance

The linked GitHub repository initially contained only a README, and the original hosted site's source could not be retrieved. Homepage text, site-specific CSS, hero image and favicon were recovered from public files on the owner-supplied `https://maisonavendre.xieyujieee.chatgpt.site/`. React components, seller behavior and the dashboard were reconstructed as maintainable source. Original compiled framework bundles are not included. Original backend code and data have not been recovered.

Icons are provided by `lucide-react` under its ISC licence. Dependency licences remain applicable. This reconstruction assigns no additional open-source licence to the owner's site content or images.
