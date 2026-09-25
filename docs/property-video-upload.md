# Property video upload

Optional MP4/WebM upload (one video, maximum 10 MiB) on the property submission form. Videos are stored in a private `listing-videos` bucket and become accessible through short-lived signed URLs only after the existing staff review publishes the listing. Staff can preview the video before approval. Explicit video publication consent is required.

Deployment order:
1. Apply `supabase/migrations/202609230006_listing_videos.sql`.
2. Deploy `submit-listing` with its shared dependencies.
3. Build and deploy the frontend.

Local validation: production build, 68 UI/parser tests, database integration assertions including private pending videos, approved video access and withdrawal.

Operational status: this change has not yet been deployed to production. Administrator email verification remains blocked until `RESEND_API_KEY` and `STAFF_EMAIL_FROM` are configured in Supabase Edge Function secrets. Do not put these secrets in source control. Existing signed media URLs can remain valid for up to five minutes after withdrawal.

## Français

Vidéo facultative MP4/WebM, maximum 10 Mio, conservée dans un stockage privé avant validation. Appliquer la migration, déployer la fonction puis le site. Le service de courriel administrateur reste à configurer.

## 中文

房源可选上传一个 MP4/WebM 视频，最大 10 MiB，审核通过后公开。本次源码已完成本地检查，正式数据库、函数和网页仍需按上述顺序部署。管理员验证码邮件需要配置 Resend 密钥及发件地址。
