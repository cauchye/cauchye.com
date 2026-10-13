import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import {
	articleSql,
	inWriteOrder,
	parseArticleFile,
	parseTagMap,
	tagSql
} from '../../scripts/add-article';

const markdown = `---
title: "It's one: workflow"
slug: one-workflow
locale: en
excerpt: Start with one; then grow.
publishedAt: 2026-10-14T00:00:00+09:00
translationOf: ja/hitotsu
tags: [AI Agents, Governance]
image: /agents/cover.png
imageAlt: A cover
imageWidth: 1200
---

## Heading

A [link](https://example.com/a) and **bold**.

- item
`;

// The columns of EmDash 0.36.0 that the script writes, as in a bootstrapped database.
function database(): DatabaseSync {
	const db = new DatabaseSync(':memory:');
	db.exec(`
		CREATE TABLE revisions (id text primary key, collection text not null, entry_id text not null, data text not null, author_id text, created_at text default (datetime('now')));
		CREATE TABLE ec_articles (id text primary key, slug text, status text default 'draft', author_id text, primary_byline_id text, created_at text, updated_at text, published_at text, scheduled_at text, deleted_at text, version integer default 1, live_revision_id text references revisions (id), draft_revision_id text references revisions (id), locale text default 'en' not null, translation_group text, title text default '' not null, excerpt text default '' not null, featured_image text, content json default 'null' not null, constraint ec_articles_slug_locale_unique unique (slug, locale));
		CREATE TABLE taxonomies (id text primary key, name text not null, slug text not null, label text not null, parent_id text, data text, locale text default 'en' not null, translation_group text, sort_order integer default 0 not null, constraint taxonomies_name_slug_locale_unique unique (name, slug, locale));
		CREATE TABLE content_taxonomies (collection text not null, entry_id text not null, taxonomy_id text not null, status TEXT, scheduled_at TEXT, deleted_at TEXT, locale TEXT, published_at TEXT, created_at TEXT, constraint content_taxonomies_pk primary key (collection, entry_id, taxonomy_id));
	`);
	return db;
}

function counter(prefix: string): () => string {
	let next = 0;
	return () => `${prefix}${++next}`;
}

describe('article files', () => {
	it('reads front matter and converts the Markdown body to Portable Text', () => {
		const article = parseArticleFile(markdown, 'one.md');
		expect(article).toMatchObject({
			title: "It's one: workflow",
			slug: 'one-workflow',
			locale: 'en',
			status: 'published',
			excerpt: 'Start with one; then grow.',
			publishedAt: '2026-10-13T15:00:00.000Z',
			translationOf: { locale: 'ja', slug: 'hitotsu' },
			tags: [
				{ slug: 'ai-agents', label: 'AI Agents' },
				{ slug: 'governance', label: 'Governance' }
			],
			featuredImage: { src: '/agents/cover.png', alt: 'A cover', width: 1200 }
		});
		const blocks = article.content as Array<Record<string, unknown>>;
		expect(blocks.map(({ style, listItem }) => listItem ?? style)).toEqual([
			'h2',
			'normal',
			'bullet'
		]);
		expect(blocks[1].markDefs).toMatchObject([{ _type: 'link', href: 'https://example.com/a' }]);
	});

	it('reads a JSON article with a Markdown body or Portable Text content', () => {
		const fields = { title: 'T', slug: 't', locale: 'ja', excerpt: 'E', status: 'draft' };
		const draft = parseArticleFile(JSON.stringify({ ...fields, body: 'Text' }), 'a.json');
		expect(draft.status).toBe('draft');
		expect(draft.publishedAt).toBeUndefined();
		expect(draft.tags).toBeUndefined();
		const content = [{ _type: 'block', children: [] }];
		expect(parseArticleFile(JSON.stringify({ ...fields, content }), 'a.json').content).toEqual(
			content
		);
	});

	it('rejects incomplete or mistyped files', () => {
		const without = (line: string) => markdown.replace(new RegExp(`^${line}.*\\n`, 'm'), '');
		expect(() => parseArticleFile('No front matter', 'a.md')).toThrow(/front matter/);
		expect(() => parseArticleFile(without('title'), 'a.md')).toThrow(/"title" is required/);
		expect(() => parseArticleFile(without('publishedAt'), 'a.md')).toThrow(/publishedAt/);
		expect(() => parseArticleFile(markdown.replace('locale: en', 'locale: fr'), 'a.md')).toThrow(
			/locale/
		);
		expect(() => parseArticleFile(markdown.replace('slug:', 'slag:'), 'a.md')).toThrow(
			/unknown field "slag"/
		);
		expect(() =>
			parseArticleFile(markdown.replace('/agents/cover.png', 'cover.png'), 'a.md')
		).toThrow(/image/);
		expect(() => parseTagMap('{"ja/a": ["日本語"]}', 'tags.json')).toThrow(/latin/);
	});

	it('writes originals before their translations', () => {
		const translation = parseArticleFile(markdown, 'one.md');
		const original = { ...translation, locale: 'ja', slug: 'hitotsu', translationOf: undefined };
		expect(inWriteOrder([translation, original]).map(({ slug }) => slug)).toEqual([
			'hitotsu',
			'one-workflow'
		]);
	});
});

describe('article SQL', () => {
	const translation = parseArticleFile(markdown, 'one.md');
	const original = {
		...translation,
		locale: 'ja',
		slug: 'hitotsu',
		title: '一つ',
		translationOf: undefined
	};
	const run = (db: DatabaseSync, statements: string[]) => db.exec(statements.join('\n'));
	const rows = (db: DatabaseSync, sql: string) =>
		db.prepare(sql).all() as Array<Record<string, unknown>>;

	it('inserts a published article with its revision, translation group, and tags', () => {
		const db = database();
		run(db, articleSql(original, '2026-10-14T01:00:00.000Z', counter('a')));
		run(db, articleSql(translation, '2026-10-14T01:00:00.000Z', counter('b')));

		const articles = rows(db, 'SELECT * FROM ec_articles ORDER BY locale');
		expect(articles).toMatchObject([
			{
				id: 'b1',
				slug: 'one-workflow',
				locale: 'en',
				status: 'published',
				title: "It's one: workflow",
				excerpt: 'Start with one; then grow.',
				published_at: '2026-10-13T15:00:00.000Z',
				version: 1,
				translation_group: 'a1',
				live_revision_id: 'b2',
				draft_revision_id: null
			},
			{ id: 'a1', slug: 'hitotsu', locale: 'ja', translation_group: 'a1', live_revision_id: 'a2' }
		]);
		expect(JSON.parse(articles[0].featured_image as string)).toEqual({
			src: '/agents/cover.png',
			alt: 'A cover',
			width: 1200
		});
		expect(JSON.parse(articles[0].content as string)).toEqual(translation.content);

		const [revision] = rows(db, "SELECT * FROM revisions WHERE id = 'b2'");
		expect(revision).toMatchObject({ collection: 'articles', entry_id: 'b1' });
		expect(Object.keys(JSON.parse(revision.data as string))).toEqual([
			'title',
			'excerpt',
			'featured_image',
			'content'
		]);

		// One term per tag, assigned once to the translation group both languages share.
		expect(rows(db, 'SELECT name, slug, label, locale FROM taxonomies ORDER BY slug')).toEqual([
			{ name: 'tag', slug: 'ai-agents', label: 'AI Agents', locale: 'en' },
			{ name: 'tag', slug: 'governance', label: 'Governance', locale: 'en' }
		]);
		expect(
			rows(
				db,
				'SELECT pivot.collection, pivot.entry_id, term.slug FROM content_taxonomies AS pivot JOIN taxonomies AS term ON term.translation_group = pivot.taxonomy_id ORDER BY term.slug'
			)
		).toEqual([
			{ collection: 'articles', entry_id: 'a1', slug: 'ai-agents' },
			{ collection: 'articles', entry_id: 'a1', slug: 'governance' }
		]);
	});

	it('updates the article with the same slug and locale', () => {
		const db = database();
		run(db, articleSql(original, '2026-10-14T01:00:00.000Z', counter('a')));
		run(
			db,
			articleSql(
				{ ...original, title: '改題', tags: [{ slug: 'cost', label: 'Cost' }] },
				'2026-10-15T01:00:00.000Z',
				counter('c')
			)
		);

		expect(rows(db, 'SELECT * FROM ec_articles')).toMatchObject([
			{
				id: 'a1',
				title: '改題',
				version: 2,
				translation_group: 'a1',
				created_at: '2026-10-14T01:00:00.000Z',
				updated_at: '2026-10-15T01:00:00.000Z',
				live_revision_id: 'c2'
			}
		]);
		expect(rows(db, 'SELECT id FROM revisions ORDER BY id')).toEqual([{ id: 'a2' }, { id: 'c2' }]);
		expect(
			rows(
				db,
				'SELECT term.slug FROM content_taxonomies AS pivot JOIN taxonomies AS term ON term.translation_group = pivot.taxonomy_id'
			)
		).toEqual([{ slug: 'cost' }]);
	});

	it('keeps the tags of an article whose file has none, and stores a draft unpublished', () => {
		const db = database();
		run(db, articleSql(original, '2026-10-14T01:00:00.000Z', counter('a')));
		const draft = {
			...original,
			status: 'draft' as const,
			publishedAt: undefined,
			tags: undefined
		};
		run(db, articleSql(draft, '2026-10-15T01:00:00.000Z', counter('d')));

		expect(rows(db, 'SELECT * FROM ec_articles')).toMatchObject([
			{ status: 'draft', published_at: null, live_revision_id: null, draft_revision_id: 'd2' }
		]);
		expect(rows(db, 'SELECT count(*) AS count FROM content_taxonomies')).toEqual([{ count: 2 }]);

		run(db, tagSql({ locale: 'ja', slug: 'hitotsu' }, [], counter('e')));
		expect(rows(db, 'SELECT count(*) AS count FROM content_taxonomies')).toEqual([{ count: 0 }]);
	});
});
