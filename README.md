# cauchye.com

Bilingual corporate one-page site for CAUCHYE ASIA PTE. LTD. Built with Astro 7 and
deployed as a server-rendered Cloudflare Worker. Page copy, FAQs, and partners are managed
in [EmDash](https://emdashcms.com) (D1 for content, R2 for media); see
[docs/design.md](docs/design.md).

## Local development

Requirements: Node.js 24.16 or newer and pnpm 11 or newer.

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm run dev
```

Set `SLACK_WEBHOOK_URL` in the untracked `.dev.vars` file to test contact delivery. Never
commit webhook values. The English and Japanese pages are available at `/en` and `/ja`;
`/` redirects to the visitor's preferred language, defaulting to `/en`.

Local development uses Wrangler's local D1, KV, and R2 emulation, so the placeholder
resource IDs in `wrangler.jsonc` are not a problem locally.

The contact form progressively enhances a normal POST. With JavaScript, localized field
errors preserve entered values. Without JavaScript, the server still validates the request
but redirects to a generic localized outcome; field values are deliberately not copied into
URLs or cookies.

Useful commands:

```sh
pnpm run check        # or: pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run preview
pnpm test             # unit tests (Vitest), then end-to-end tests (Playwright)
pnpm run seed:build   # regenerate seed/seed.json
pnpm run deploy:dry-run
```

The end-to-end tests need Playwright's browser once: `pnpm exec playwright install
chromium-headless-shell`. Each run starts from an empty local database, bootstraps EmDash,
and seeds the bundled content, so the suite exercises the CMS-rendered site.

## Content management

EmDash collections hold the editable content, in English and Japanese:

| Collection | Content                                                              |
| ---------- | -------------------------------------------------------------------- |
| `pages`    | One entry per route: title, meta description, hero, and section copy |
| `faqs`     | FAQ items of the agent adoption and solution development pages       |
| `partners` | Partner name, link, logo, and the pages each partner appears on      |

Interface strings (navigation, form labels, validation messages) stay in `messages/*.json`.
That file and `src/partners.ts` also hold the bundled copy of the content: it is what
`seed/seed.json` is generated from, and what a page falls back to when an entry is missing
or the database is unreachable. After changing either, run `pnpm run seed:build`; a unit
test fails when the committed seed is out of date. The seed only populates an empty
database — once the site is live, edit content in EmDash.

Media uploaded in EmDash is stored in the `MEDIA` R2 bucket. The existing logos and
screenshots in `public/` are still served as static assets; a partner's uploaded logo takes
precedence over its bundled `logo_path`.

### Administration

The public site has no sign-in. EmDash's admin (`/_emdash/admin`), its first-admin setup,
and its sign-in, OAuth, and MCP endpoints answer `503` unless the `EMDASH_ADMIN_ENABLED`
variable is exactly `"true"`; it is `"false"` in `wrangler.jsonc`. Media delivery under
`/_emdash/api/media/` stays public.

A new database is initialised in two steps:

1. The first public request creates the EmDash schema. Pages render from the bundled
   content until the next step.
2. Seed the content with a one-time token, without opening the admin:

   ```sh
   pnpm exec wrangler secret put EMDASH_BOOTSTRAP_TOKEN   # long random value
   curl -X POST https://www.cauchye.com/_emdash/api/setup \
     -H "Authorization: Bearer $EMDASH_BOOTSTRAP_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"CAUCHYE ASIA PTE. LTD.","includeContent":true}'
   pnpm exec wrangler secret delete EMDASH_BOOTSTRAP_TOKEN
   ```

To edit content, set `EMDASH_ADMIN_ENABLED` to `"true"`, deploy, and register the owner
passkey at `/_emdash/admin`. While the variable is `"true"` and no owner exists, anyone who
reaches the setup page can claim the site, so register the owner immediately (or put
Cloudflare Access in front of `/_emdash/admin` first).

## Cloudflare deployment

The Worker is named `cauchye-com` and `wrangler.jsonc` targets CAUCHYE ASIA account
`89d1d38c83b2dbcc52f5df0f165a05ab`.

**The D1 database, KV namespace, and R2 bucket in `wrangler.jsonc` are placeholders.** They
have not been created; deployment fails until they exist and their IDs are filled in:

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create cauchye-com            # → d1_databases[0].database_id
pnpm exec wrangler kv namespace create SESSION      # → kv_namespaces[0].id
pnpm exec wrangler r2 bucket create cauchye-com-media
pnpm run types                                      # after editing wrangler.jsonc
```

Then add the production secret interactively and deploy:

```sh
pnpm exec wrangler secret put SLACK_WEBHOOK_URL
pnpm run deploy:dry-run
pnpm run deploy
```

`pnpm run deploy` updates the existing `cauchye-com` Worker. Its Custom Domains
(`www.cauchye.com` and `cauchye.com`) are configured once in the Cloudflare dashboard and
intentionally omitted from Wrangler so routine CD does not need zone-level permissions. A
Cloudflare Single Redirect rule permanently redirects the apex domain to `www.cauchye.com`
while preserving paths and query strings.

`wrangler.jsonc` is the single deployment source of truth. Its `main` is `src/worker.ts`,
which wraps the Astro handler with the EmDash administration gate and EmDash's scheduled
handler; the Astro Cloudflare adapter builds from the same file.

## GitHub CD

`.github/workflows/deploy.yml` validates pull requests and every manual run. It deploys only
pushes to `main` or manual runs started from `main`, through the **Production** GitHub
environment.

Create the least-privilege CD token in the Cloudflare dashboard:

1. Open **CAUCHYE ASIA → Manage Account → Account API Tokens**, then select **Create Token**.
2. Create a custom token with **Workers Scripts — Edit**. The Worker now binds D1, KV, and
   R2, which may additionally require **D1 — Edit**, **Workers KV Storage — Edit**, and
   **Workers R2 Storage — Edit**; this has not been verified against the real account yet.
   Custom Domains are managed separately in Cloudflare, so no Zone, DNS, or Workers Routes
   permission is required.
3. Save the token value as the GitHub **Production** environment secret
   `CLOUDFLARE_API_TOKEN`.
4. Save the CAUCHYE ASIA account ID as the GitHub **Production** environment variable
   `CLOUDFLARE_ACCOUNT_ID`.

Any disposable token used during initial setup is not the CD token. Do not reuse it in
GitHub; create the restricted token above specifically for continuous deployment.

The Slack webhook remains a Cloudflare Worker secret and is not passed through GitHub.

## Production cutover checklist

1. Confirm the Cloudflare zone is active and neither hostname has a conflicting CNAME.
2. Create the D1 database, KV namespace, and R2 bucket and replace the placeholder IDs in
   `wrangler.jsonc`.
3. Set `SLACK_WEBHOOK_URL` with `wrangler secret put`.
4. Run check, lint, test, build, and `pnpm run deploy:dry-run`.
5. Deploy the Worker and verify `/`, `/en`, `/ja`, assets, both hostnames, metadata, and
   contact delivery.
6. Seed the EmDash content with the one-time bootstrap token (see Administration) and
   confirm `/_emdash/admin` answers `503`.
7. Confirm logs and observability in Cloudflare, including a controlled contact failure.

The former Vercel project is disconnected from Git and no longer participates in deployment.
