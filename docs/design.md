# cauchye.com — EmDash content design

Status: implemented on `feat/emdash-migration`; not yet deployed. The Cloudflare D1, KV, and
R2 resources in `wrangler.jsonc` exist in the CAUCHYE ASIA account (created 2026-10-13).

## Boundary

cauchye.com is a bilingual corporate site, not an application. EmDash is added for one
purpose: letting staff edit the site's content without a code change. The public design,
URLs, and language handling are unchanged, and the public site has no accounts or sign-in.

## Content model

| Collection | One entry is             | Fields                                                                                                                |
| ---------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `pages`    | a public route (6)       | `title`, `description`, `eyebrow`, `hero_title_lead`, `hero_title_accent`, `hero_body`, `copy` (JSON)                 |
| `faqs`     | a question on a FAQ page | `question`, `answer`, `page`, `sort_order`                                                                            |
| `partners` | a partner logo           | `name`, `url`, `logo` (image), `logo_path`, `logo_class`, `show_on_it_ai`, `show_on_corporate_advisory`, `sort_order` |
| `articles` | an article               | `title`, `excerpt`, `featured_image` (image), `content` (Portable Text)                                               |

Every entry exists once per locale (`en` is the default, `ja` is linked with
`translationOf`). Public queries always ask for `status: "published"` and a locale.

The page templates were written against a flat dictionary of message keys
(`messages/*.json`). That stays the rendering contract: `src/cms/content.ts` overlays the
published `pages` entries on the bundled dictionary and hands the result to the unchanged
components. `src/cms/schema.ts` assigns every message key to exactly one owner — the
interface, the FAQ collection, or one page — and a page entry can only replace keys it
owns. A page's hero and metadata have dedicated fields; the rest of its section copy is the
`copy` JSON object keyed by message key. This keeps about 220 strings per locale editable without as many
schema fields, at the cost of a plain JSON editor for section copy. Promoting a section to
structured fields later is a schema change plus a mapping entry, not a template rewrite.

Interface strings — navigation, breadcrumbs, form labels, validation and status messages —
are code, not content, and are not in the CMS. The contact endpoint keeps using them
directly.

### Bundled content and fallback

`messages/*.json` and `src/partners.ts` remain the bundled copy of the content.
`scripts/build-seed.ts` generates `seed/seed.json` (schema and content) from them, and a
unit test fails if the committed seed drifts. At runtime a missing entry, an empty field,
or a failed query falls back to the bundled value, so a database problem degrades to the
last committed copy instead of a blank page. A populated `partners` collection is
authoritative, including when it deliberately leaves a page without partners.

The trade-off is that the bundled copy goes stale as editors change content in EmDash. It
is a safety net and the source of the initial seed, not a second place to edit.

### Articles

`articles` mirrors fde-mission's collection of the same name, so an export of its entries
and media can be loaded into a local database with `scripts/import-articles.ts`; the
article text and images themselves stay out of the repository. Unlike the other collections it has
no bundled fallback: `/[lang]/articles` lists what is published (newest first, 12 per page)
and `/[lang]/articles/[slug]` answers 404 for a draft, an unknown slug, or an article that
exists only in the other language.

Articles are linked from the header and footer, a "latest articles" section on the home
page, a "related articles" section on the four business pages, and an "other articles"
section plus a contact call-to-action below each article. All of them appear only while
the current language has a published article, so the existing pages are unchanged until
something is published. They share one lookup per request (`getLatestArticles`: the four
newest articles, of which a section shows three). The business pages have no tags to
match, so their "related" articles are the newest ones.

Below an article, the section picks by tag instead (`getRelatedArticles`): among the 50
newest articles of the same language, the ones sharing the most tags come first, ties and
the remaining places go to the newest, and the heading reads "related articles" only when
at least one shares a tag. Tags are terms of EmDash's `tag` taxonomy assigned to the
article's translation group, so both languages share them; they are written by
`pnpm run articles:add` (see [articles.md](articles.md)).

`/rss.xml` (both languages) and `/<locale>/rss.xml` are RSS 2.0 feeds of the 30 newest
articles, with absolute links, `pubDate`, and the tags as categories; without articles
they are valid empty feeds. Every page links its language's feed in the `<head>`.

`/sitemap.xml` replaces EmDash's sitemap, which knows neither the static pages nor the
`/<locale>` prefix. It lists every static page and published article once per locale, each
with `hreflang` alternates; translations are paired by translation group, and an article
published in one language names only that language. The page `<head>` follows the same
rule, and article pages add `og:type=article`, the cover image, and the publication time.
Every page has an absolute `og:image` and `twitter:image`: the article's cover image, or
`public/og-default.png` (1200x630, generated by `pnpm run og:build`). Sample articles for previews and end-to-end tests live in
`tests/fixtures/` and are applied to the local database only; they are not in the seed.

### Media

EmDash stores uploads in the `MEDIA` R2 bucket and serves them from
`/_emdash/api/media/file/...`. The existing logos, brand marks, and screenshots stay in
`public/` as static assets: seeded partners reference them through `logo_path`, and an
uploaded `logo` takes precedence. Partner logo sizing is a small allow-list of utility
classes, because classes that never appear in the source are not in the compiled CSS.

## Routing and i18n

Public routes are still the explicit `/[lang]/...` pages, with `/` redirecting by
`Accept-Language`. Astro's `i18n` block exists only to tell EmDash which locales content
has; `routing: "manual"` with a pass-through middleware keeps Astro from adding locale
routing of its own. EmDash's system routes live under the unprefixed `/_emdash/`.

## Administration and trust

- `src/worker.ts` wraps the Astro handler. While `EMDASH_ADMIN_ENABLED` is not exactly
  `"true"` it answers a non-cacheable `503` for `/_emdash/admin`, `/_emdash/api/setup`,
  `/_emdash/api/auth`, `/_emdash/api/oauth`, `/_emdash/oauth`, `/_emdash/api/mcp`, and
  `/_emdash/.well-known/auth`. This is broader than fde-mission's gate (admin and setup
  only) because here "closed" is the normal state rather than a launch-time precaution.
  Media delivery and other content routes under `/_emdash/` stay reachable.
- A fresh database must not expose EmDash's first-admin race. The only opening while the
  admin is closed is the exact `POST /_emdash/api/setup` carrying the high-entropy
  `EMDASH_BOOTSTRAP_TOKEN` secret; it applies the seed and creates no user. Remove the
  secret afterwards.
- EmDash redirects visitors to its setup wizard when its tables do not exist. Because that
  wizard is closed, the Worker reacts to that redirect on public `GET`/`HEAD` requests by
  running EmDash's unauthenticated runtime initialisation once (schema only) and then
  serving the requested page. A deployment against an empty database therefore serves the
  bundled content instead of an error.
- EmDash staff authentication (passkeys, stored in D1; sessions in the `SESSION` KV
  namespace) only becomes reachable when the admin is enabled. The private content API
  requires an EmDash session regardless.

## Infrastructure

- Astro server output on Cloudflare Workers; EmDash's D1 (`DB`) and R2 (`MEDIA`) adapters;
  Astro sessions in KV (`SESSION`).
- A per-minute cron trigger runs EmDash's scheduled handler (scheduled publishing and
  housekeeping).
- React is a dependency of the EmDash admin only. The public site remains Astro + Svelte.
- No transactional email provider and no sandboxed plugins are configured; passkeys are the
  only staff sign-in method.
