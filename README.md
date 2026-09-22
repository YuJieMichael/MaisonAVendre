# MaisonÀVendre

Montréal real estate homepage, trilingual seller journey and seller dashboard built with **React, TypeScript and Vite**. Editable source code, not a screenshot or a compiled-app copy.

产品方向：卖家自主推进，再按需要增加摄影、视频、市场分析、咨询或经纪帮助。首阶段服务区域为蒙特利尔，价格待定。

## 本地运行 / Run locally

Use Node.js 22.12+ or a supported newer LTS release.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. The seller journey is at `/#vendre`, the dashboard at `/#dashboard`, and project editing at `/#vendre/edit`.

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
- Choose service → property details → appointment preference → review → seller dashboard.
- Address, city, Canadian postal-code validation, property type, desired price, existing broker and sale timeline.
- Up to 8 local photo previews with removal; JPG, PNG and WebP, 10 MB per file. Files are not uploaded.
- Contact details, communication language, preferred date/time, validation and editable review.
- Seller dashboard: overview, property, buyers, viewings, offers, documents, optional services and support mode.
- Clearly labelled fictional example data; the user's own unpublished project shows no invented performance figures.
- Select/remove optional services and switch support preference while preserving entered property details, photos, documents and services within the current session.
- Local viewing notes, example buyer filtering/status changes and example offer details. No invitations, offers or enquiries are sent.
- Local document centre: up to 10 PDF/JPG/PNG/WebP files, 10 MB each, with download and removal.
- Responsive layout and keyboard-accessible controls.

## 演示范围 / Demo boundaries

**No backend, database, authentication, email delivery, payment processing or confirmed booking is implemented.** Data, photos and documents stay in memory across homepage, seller journey and dashboard navigation. Refreshing or closing the page clears them. Personal data are neither transmitted nor stored in browser storage.

- All optional service prices show **pricing to be confirmed**. Selection creates a local plan, not an order. Switching support records a preference, not a brokerage mandate.
- Property search shows an unavailable message. There is no real listings feed, saved search, secure server upload or buyer account yet. The seller dashboard is an interactive frontend demo.
- The homepage contact form validates inputs but explicitly says nothing was sent.
- Brokerage and self-sale presentation services are separate. This UI is not a compliant service agreement.
- Some homepage marketing was retained from the published site. Before production, verify service claims, broker identity/licence, company information, privacy/terms and personal-data collection notices. Footer legal labels are placeholders, not completed policy pages.
- Uploading this repository does **not** update the existing `chatgpt.site` website. No hosting or payment account is configured.

## 文件结构 / Source map

```text
src/main.tsx          Homepage, navigation, language state
src/home-copy.json    Recovered trilingual homepage text
src/seller-flow.tsx   Seller flow, form validation, photo previews
src/seller-copy.ts    Trilingual seller-flow text
src/project.tsx      Shared in-memory project state
src/dashboard.tsx    Eight dashboard views and trilingual copy
src/dashboard.css    Responsive seller workspace styling
src/original.css      Recovered site-specific homepage styling
src/styles.css       Shared controls and responsive seller design
public/              Existing hero image and favicon
```

## Recovery provenance

The linked GitHub repository initially contained only a README, and the original hosted site's source could not be retrieved. Homepage text, site-specific CSS, hero image and favicon were recovered from public files on the owner-supplied `https://maisonavendre.xieyujieee.chatgpt.site/`. React components, seller behavior and the dashboard were reconstructed as maintainable source. Original compiled framework bundles are not included. Original backend code and data have not been recovered.

Icons are provided by `lucide-react` under its ISC licence. Dependency licences remain applicable. This reconstruction assigns no additional open-source licence to the owner's site content or images.
