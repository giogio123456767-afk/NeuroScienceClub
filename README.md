# Neuroscience Research Gallery (Cloudflare Pages + D1 + R2)

## Deploy (one time)
```bash
npm i -g wrangler && wrangler login
wrangler d1 create neuro-gallery          # paste database_id into wrangler.toml
wrangler d1 execute neuro-gallery --remote --file=schema.sql
wrangler r2 bucket create neuro-papers
wrangler pages project create neuro-gallery --production-branch main
wrangler pages deploy public
wrangler pages secret put ADMIN_PASSWORD  # enter N3UR0 (recommended)
```
If you prefer the dashboard: Pages → your project → Settings → Bindings, add D1 `DB` and R2 `BUCKET`.

## Local test
```bash
wrangler d1 execute neuro-gallery --local --file=schema.sql
wrangler pages dev public
```

## Customize
- Club name: top of `public/app.js`
- Officers + photos: `public/officers.html` (drop images in `public/images/`)
- Admin password: checked **server-side** in `functions/api/[[path]].js` (secret `ADMIN_PASSWORD`, falls back to `N3UR0`).
