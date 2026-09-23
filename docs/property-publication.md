# Reviewed property publication

English: The top-right Properties link opens `#proprietes` directly, without the buyer enquiry gate. Sellers can open `#publier` from the catalogue or seller entry, add property details and 1–4 photos, preview the public information, and request review without an account. The original contact-enquiry form still requires only name and email; a listing additionally needs the information necessary for a public property card. Contact details are private. An MFA staff member reviews and publishes or declines the listing, and can unpublish it later.

Français : Le lien Propriétés ouvre le catalogue sans formulaire préalable. Les vendeurs préparent leur annonce et leurs photos, puis demandent un examen sans connexion. Les coordonnées restent privées. Seule l’équipe autorisée avec authentification multifacteur peut publier ou retirer une annonce.

中文：右上角房源入口直接浏览列表。卖家可以填写房屋信息、添加照片和预览，然后申请审核，无需买家或卖家登录。联系资料不公开，管理员通过双重验证后可以审核公开、拒绝或下架。

## Activation status

Local UI and backend source are ready; `VITE_LISTING_PUBLICATION_ENABLED=false` by default. Pending setup never reports a successful submission or publication. The public catalogue currently shows labelled fictional examples. No sample listing is automatically converted into a real seller listing. Existing production hosting has not been updated.

1. Apply migrations 002 (rate-limit table dependency) and 003 to a staging/target Supabase project, skipping migrations already applied. Migration 001 was manually applied previously: compare schema/history rather than blindly replaying it.
2. Deploy `submit-listing` with repository function config. `APP_ORIGIN` must be the actual frontend origin. The built-in Supabase URL and service-role key stay server-side. An optional independent `ENQUIRY_RATE_SALT` overrides the server-only hashing salt. There is no dependency on Resend and no email is sent by this function.
3. Set up the platform owner's real staff account and MFA before allowing real submissions. Supabase Dashboard login is not a website administrator account. Review uses the existing staff table and authoritative database checks; customer accounts and AAL1 sessions cannot publish or read private submissions.
4. Exercise the real Storage and Edge runtimes in staging: upload JPEG/PNG/WebP, retry the same request, review under MFA, read the public catalogue anonymously, verify that pending photos/contact are inaccessible, and unpublish. Browser tests cover local previews; PGlite tests cover SQL/RLS and publication lifecycle, not Supabase HTTP runtime behavior.
5. Set `VITE_LISTING_PUBLICATION_ENABLED=true`, rebuild and deploy after those checks. Anonymous submission is rate-limited to 5 requests per client/day and 100/day globally; confirm trustworthy gateway forwarding and add CAPTCHA if necessary for production traffic.

Public rows contain only an explicit property-field allowlist, photo paths and publication date. Contacts, fingerprint and review notes stay private. Photos use a separate private bucket (`listing-photos`), not the seller's private document bucket. Read permission is granted only after publication or to MFA staff. Public photo URLs expire after five minutes, so previously issued links can remain usable briefly after unpublishing. The catalogue refreshes every four minutes and shows at most the latest 1000 approved rows plus clearly labelled examples; remove examples and add pagination before a larger production launch.

Uploads are capped at four photos of 1.5 MB each (9 MB JSON request cap including Base64), MIME signatures are checked, and photos cannot overwrite existing objects. Interrupted uploads retain an `uploading` row; the same request ID/body can resume. Such rows are excluded from the review queue. Define retention and cleanup of abandoned uploads before public launch. Admins see the actual photos and seller contact before publication and should verify the seller's authority and image content. Submission is a request for review, not proof of identity or ownership.

Current live check: the Supabase project has **0 active website staff members**, and `published_listings` is absent (read-only Dashboard SQL check). No new migrations or Edge Functions were deployed in this change. Website administrator registration/MFA and backend activation remain required; no real seller submission has been collected or published.
