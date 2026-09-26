# goldeneyevr.com

The one-page website for [GoldenEye VR](https://github.com/MrSco/goldeneye-vr),
served by Cloudflare Workers as static files. Plain HTML and CSS, no framework,
no build step.

| Path | What |
|------|------|
| `public/` | The site, exactly as served: `index.html`, `styles.css`, `main.js`, images, fonts |
| `public/_headers` | Security headers (CSP) and font caching, applied by Cloudflare |
| `media-src/` | Full-size sources: headset screenshots and the project's own art |
| `tools/media.py` | Turns `media-src/` into the web images in `public/img/` |
| `wrangler.jsonc` | Cloudflare config: serve `public/`, attach the two hostnames |

## Preview locally

```bash
npm install
npm run dev
```

Then open http://localhost:8787. This runs the same static-asset server
Cloudflare uses, including `_headers`, so a CSP mistake shows up here first.

## Change the screenshots

1. Take screenshots in the headset, then copy them off (copy, don't move):
   `adb pull /sdcard/Oculus/Screenshots/<file>.jpg media-src/shots/<name>.jpg`
2. `npm run media` (needs Python with Pillow). Each `<name>.jpg` becomes
   `public/img/shots/<name>.webp` and `<name>-thumb.webp`, trimmed of the black
   around a floating screen and padded to 16:9.
3. In `public/index.html`, point a gallery `<figure>` at the new name and write
   its caption and alt text.

## What stays current by itself

- **Download APK** links to `releases/latest`. On page load, `main.js` asks the
  GitHub API for the latest release and puts its version and direct APK link on
  the button. If that call fails, the button still goes to the release page.
- The video is a YouTube link until someone presses play, then a
  `youtube-nocookie.com` embed. No YouTube requests or cookies before that.

## Deploying

Pushing to `main` deploys (Cloudflare Workers Builds). Other branches get a
preview URL.

### One-time Cloudflare setup

The domain is on Cloudflare Registrar, so its DNS zone already exists.

1. **Connect the repo.** Dashboard → **Workers & Pages** → **Create** →
   **Import a repository** → GitHub → `MrSco/goldeneyevr.com`.
   - Project name: `goldeneyevr` (must match `name` in `wrangler.jsonc`)
   - Build command: leave empty
   - Deploy command: `npx wrangler deploy` (the default)
2. **Domains.** The first deploy attaches `goldeneyevr.com` and
   `www.goldeneyevr.com` from `wrangler.jsonc` and issues certificates. If it
   says a DNS record already exists for one of them, delete that record under
   **DNS → Records** and retry the deploy.
3. **www → bare domain.** Zone `goldeneyevr.com` → **Rules** → **Redirect
   Rules** → **Create rule** → template **Redirect from WWW to root**, status 301.
4. **Analytics (optional, free).** **Web Analytics** → **Add a site** →
   `goldeneyevr.com` → automatic setup. It is cookieless, so no consent banner,
   and the CSP already allows its script. If automatic setup shows no visits,
   paste its `<script defer src="https://static.cloudflareinsights.com/...">`
   snippet before `</body>` in `index.html` instead.
5. **Email (optional, free).** Zone → **Email** → **Email Routing**, forward
   `contact@goldeneyevr.com` to your inbox.

Until the domain is attached, the site is also at
`https://goldeneyevr.<your-account>.workers.dev`.

## Rules for this site

- Only the project's own art (the eye and reticle, from `goldeneye-vr/docs/art`)
  and screenshots from the headset. No Nintendo or Rare logos, box art or the
  007 gun-barrel logo, and no links to ROMs.
- Keep it non-commercial: no ads, no donation button.
- The footer disclaimer mirrors the port's README. Change them together.

Fonts: Barlow Semi Condensed, SIL Open Font License (`public/fonts/OFL.txt`).
