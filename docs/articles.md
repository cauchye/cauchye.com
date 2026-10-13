# Publishing articles without the admin screen

EmDash's admin is closed (`EMDASH_ADMIN_ENABLED` is `"false"`), so articles are written as
files under `content/articles/` and written to D1 by `scripts/add-article.ts`
(`pnpm run articles:add`). The script turns each file into SQL that matches what EmDash
0.36.0 stores for a published entry and runs it with `wrangler d1 execute`:

- one `ec_articles` row, matched by `slug` and `locale` — inserted when new, otherwise
  updated with `version + 1` (EmDash's own triggers keep the search index and the media
  usage queue in step);
- one `revisions` row holding the fields, linked as the row's `live_revision_id`
  (`draft_revision_id` for a draft);
- the tags: one `taxonomies` term per tag in EmDash's `tag` taxonomy, assigned in
  `content_taxonomies` to the article's translation group.

Running it again with the same file updates the article; nothing is duplicated.

## Article files

One file per article and language, by convention `content/articles/<locale>/<slug>.md`:

```md
---
title: Start AI Agent Adoption with One Workflow
slug: ai-agent-adoption-start-with-one-workflow
locale: en
excerpt: One or two sentences for the list, the feed, and link previews.
publishedAt: 2026-10-14T00:00:00+09:00
translationOf: ja/ai-agent-adoption-start-with-one-workflow
tags: [AI Agents, Automation]
---

Body in Markdown.
```

| Field                       | Required     | Meaning                                                                                                                                                                                                |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`, `excerpt`          | yes          | Text. Quote a value with `"..."` when it starts with a quote or `[`.                                                                                                                                   |
| `slug`                      | yes          | Lowercase letters, digits, hyphens. The URL is `/<locale>/articles/<slug>`.                                                                                                                            |
| `locale`                    | yes          | `en` or `ja`.                                                                                                                                                                                          |
| `publishedAt`               | if published | ISO 8601 date and time. It orders the list and is the feed's `pubDate`.                                                                                                                                |
| `status`                    | no           | `published` (default) or `draft`. A draft is stored but not public.                                                                                                                                    |
| `translationOf`             | no           | `<locale>/<slug>` of the article this one translates. Links the two for the language switch, `hreflang`, and the sitemap. Set it on one of the two files only.                                         |
| `tags`                      | no           | `[One, Two]`. The label is stored as written; the slug is derived from it (`AI Agents` → `ai-agents`), so labels use latin letters. Leaving the field out keeps the article's tags; `[]` removes them. |
| `image`, `imageAlt`         | no           | Cover image: a site path of a file in `public/` or an `https://` URL. Without one, the article shares `/og-default.png`.                                                                               |
| `imageWidth`, `imageHeight` | no           | Pixel size of the cover image.                                                                                                                                                                         |

The front matter is a flat list of `key: value` lines, not full YAML. A `.json` file with
the same fields plus `body` (Markdown) or `content` (Portable Text blocks) works too.

The body is converted with EmDash's own Markdown-to-Portable-Text converter. It supports
headings (`##` to `####` are styled), paragraphs, `-` and `1.` lists, `> ` quotations,
fenced code blocks, images on their own line, and inline `**bold**`, `_italic_`, `` `code` ``,
and `[links](https://…)`. Two things to know: every paragraph and list item is one line
(a line break starts a new paragraph), and `_` pairs inside a line read as italics.

Tags belong to the translation group, so both languages of an article share them: give
both files the same `tags`. Related articles below an article are the same-language
articles sharing the most tags, filled up with the newest ones.

## Checking locally

The script needs a database EmDash has already created its tables in. For a local
database, start the site once and seed it (see the README), then:

```sh
pnpm run articles:add --dry-run content/articles/ja/<slug>.md content/articles/en/<slug>.md   # print the SQL
pnpm run articles:add --local content/articles/ja/<slug>.md content/articles/en/<slug>.md
pnpm run build && pnpm exec wrangler dev
curl -s http://127.0.0.1:8787/ja/rss.xml | head -30
curl -s http://127.0.0.1:8787/ja/articles/<slug> | grep -E 'og:image|twitter:image'
```

`--local` writes to Wrangler's local SQLite file under `.wrangler/state`; add
`--persist-to <directory>` when `wrangler dev` runs with one. It cannot reach production.

## Publishing to production

After the change that adds the files is merged and deployed:

```sh
pnpm exec wrangler d1 export cauchye-com --remote --output backup-$(date +%Y%m%d).sql   # optional backup
pnpm run articles:add --remote content/articles/ja/<slug>.md content/articles/en/<slug>.md
```

`--remote` writes to the production D1 database `cauchye-com` and needs Wrangler to be
signed in (or `CLOUDFLARE_API_TOKEN`) with D1 edit permission on the CAUCHYE ASIA account.
The script first checks that the database has `ec_articles` and that every article named
by `translationOf` exists, and stops before writing otherwise. It ends by printing the
rows it wrote. The feeds are cached for an hour.

To correct a published article, edit its file and run the same command again. To take one
down, set `status: draft` and run it again.

## Tagging articles that are already published

`content/articles/tags.json` maps `<locale>/<slug>` to tag labels for articles that are in
the database but have no file here (the articles imported from fde-mission):

```sh
pnpm run articles:add --local --tags content/articles/tags.json
pnpm run articles:add --remote --tags content/articles/tags.json
```

Each entry replaces the tags of that article's translation group; naming one language of
an article is enough. The command stops before writing if a listed article is missing.
