# cauchye.com

Bilingual corporate one-page site for CAUCHYE ASIA PTE. LTD. Built with Astro 7 and
deployed as a server-rendered Cloudflare Worker.

## Local development

Requirements: Node.js 24.16 or newer and npm.

```sh
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Set `SLACK_WEBHOOK_URL` in the untracked `.dev.vars` file to test contact delivery. Never
commit webhook values. The English and Japanese pages are available at `/en` and `/ja`;
`/` redirects to `/en`.

The contact form progressively enhances a normal POST. With JavaScript, localized field
errors preserve entered values. Without JavaScript, the server still validates the request
but redirects to a generic localized outcome; field values are deliberately not copied into
URLs or cookies.

Useful commands:

```sh
npm run check
npm run lint
npm run build
npm run preview
npm test
npm run deploy:dry-run
```

## Cloudflare deployment

The Worker is named `cauchye-com` and `wrangler.jsonc` targets CAUCHYE ASIA account
`89d1d38c83b2dbcc52f5df0f165a05ab`. Authenticate Wrangler, then add the production
secret interactively:

```sh
npx wrangler login
npx wrangler secret put SLACK_WEBHOOK_URL
npm run deploy:dry-run
npm run deploy
```

`npm run deploy` updates the existing `cauchye-com` Worker. Its Custom Domains
(`www.cauchye.com` and `cauchye.com`) are configured once in the Cloudflare dashboard and
intentionally omitted from Wrangler so routine CD does not need zone-level permissions. A
Cloudflare Single Redirect rule permanently redirects the apex domain to `www.cauchye.com`
while preserving paths and query strings.

`wrangler.jsonc` is the deployment source of truth. `wrangler.astro.jsonc` mirrors its
runtime settings without a generated `main` path so Astro checks can run before `dist/`
exists; keep the shared account, route, compatibility, asset, and observability settings
in sync.

## GitHub CD

`.github/workflows/deploy.yml` validates pull requests and every manual run. It deploys only
pushes to `main` or manual runs started from `main`, through the **Production** GitHub
environment.

Create the least-privilege CD token in the Cloudflare dashboard:

1. Open **CAUCHYE ASIA → Manage Account → Account API Tokens**, then select **Create Token**.
2. Create a custom token with only **Workers Scripts — Edit**. Custom Domains are managed
   separately in Cloudflare, so no Zone, DNS, or Workers Routes permission is required.
3. Save the token value as the GitHub **Production** environment secret
   `CLOUDFLARE_API_TOKEN`.
4. Save the CAUCHYE ASIA account ID as the GitHub **Production** environment variable
   `CLOUDFLARE_ACCOUNT_ID`.

Any disposable token used during initial setup is not the CD token. Do not reuse it in
GitHub; create the restricted token above specifically for continuous deployment.

The Slack webhook remains a Cloudflare Worker secret and is not passed through GitHub.

## Production cutover checklist

1. Confirm the Cloudflare zone is active and neither hostname has a conflicting CNAME.
2. Set `SLACK_WEBHOOK_URL` with `wrangler secret put`.
3. Run check, lint, build, and `npm run deploy:dry-run`.
4. Deploy the Worker and verify `/`, `/en`, `/ja`, assets, both hostnames, metadata, and
   contact delivery.
5. Confirm logs and observability in Cloudflare, including a controlled contact failure.

The former Vercel project is disconnected from Git and no longer participates in deployment.
