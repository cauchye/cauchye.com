import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { buildSeed } from '../../scripts/build-seed';
import { exportedRows, planArticleImport } from '../../scripts/import-articles';
import {
	type ArticleEntry,
	articlePage,
	articleSlug,
	formatArticleDate,
	portableImageSource,
	resolveArticle,
	resolveArticles,
	youtubeEmbedSource
} from '../../src/cms/articles';

const seed = buildSeed();

function entry(id: string, data: Record<string, unknown>): ArticleEntry {
	return { id, data };
}

describe('articles seed', () => {
	it('defines the articles collection with the fde-mission fields', () => {
		const collection = seed.collections.find(({ slug }) => slug === 'articles');
		expect(collection?.fields.map(({ slug, type }) => [slug, type])).toEqual([
			['title', 'string'],
			['excerpt', 'text'],
			['featured_image', 'image'],
			['content', 'portableText']
		]);
	});

	it('carries exactly the imported articles, each in a supported locale', async () => {
		const imported = JSON.parse(
			await readFile(new URL('../../seed/articles.json', import.meta.url), 'utf8')
		);
		expect(seed.content.articles).toEqual(imported.articles);

		const ids = new Set(seed.content.articles.map(({ id }) => id));
		for (const article of seed.content.articles) {
			expect(['en', 'ja']).toContain(article.locale);
			if (article.translationOf) expect(ids).toContain(article.translationOf);
		}
	});

	it('keeps the local fixtures out of the bundled seed', async () => {
		const fixtures = JSON.parse(
			await readFile(new URL('../fixtures/articles-seed.json', import.meta.url), 'utf8')
		);
		const fixtureIds: string[] = fixtures.content.articles.map(({ id }: { id: string }) => id);
		expect(fixtureIds.length).toBeGreaterThan(0);
		expect(seed.content.articles.filter(({ id }) => fixtureIds.includes(id))).toEqual([]);
	});
});

describe('article resolution', () => {
	it('prefers the content slug and strips a locale prefix from the entry id', () => {
		expect(articleSlug('en/story', 'story', 'en')).toBe('story');
		expect(articleSlug('en/story', null, 'en')).toBe('story');
		expect(articleSlug('/ja/story', undefined, 'ja')).toBe('story');
		expect(articleSlug('story', null, 'en')).toBe('story');
	});

	it('resolves a published entry to its public summary', () => {
		const publishedAt = new Date('2026-09-08T03:00:00Z');
		expect(
			resolveArticle(
				'ja',
				entry('ja/story', {
					slug: 'story',
					title: 'Title',
					excerpt: 'Excerpt',
					featured_image: {
						id: 'media-id',
						alt: 'Cover',
						width: 1600,
						height: 900,
						meta: { storageKey: 'editorial/cover image.png' }
					},
					publishedAt
				})
			)
		).toEqual({
			slug: 'story',
			title: 'Title',
			excerpt: 'Excerpt',
			image: {
				src: '/_emdash/api/media/file/editorial/cover%20image.png',
				alt: 'Cover',
				width: 1600,
				height: 900
			},
			publishedAt
		});
	});

	it('tolerates missing optional fields and skips entries without a title', () => {
		const createdAt = new Date('2026-09-01T00:00:00Z');
		expect(resolveArticle('en', entry('en/bare', { title: 'Bare', createdAt }))).toEqual({
			slug: 'bare',
			title: 'Bare',
			excerpt: '',
			image: undefined,
			publishedAt: createdAt
		});
		expect(
			resolveArticle('en', entry('en/alt', { title: 'Alt', featured_image: { src: '/a.png' } }))
				?.image
		).toEqual({ src: '/a.png', alt: 'Alt', width: undefined, height: undefined });
		expect(resolveArticle('en', entry('en/untitled', { title: '  ' }))).toBeUndefined();
		expect(
			resolveArticle('en', entry('en/no-image', { title: 'T', featured_image: {} }))?.image
		).toBeUndefined();
	});

	it('lists articles newest first with undated ones last', () => {
		const articles = resolveArticles('en', [
			entry('en/old', { title: 'Old', publishedAt: new Date('2026-01-01T00:00:00Z') }),
			entry('en/undated', { title: 'Undated' }),
			entry('en/untitled', {}),
			entry('en/new', { title: 'New', publishedAt: new Date('2026-09-01T00:00:00Z') })
		]);
		expect(articles.map(({ slug }) => slug)).toEqual(['new', 'old', 'undated']);
	});

	it('formats dates for each locale', () => {
		const date = new Date('2026-09-08T03:00:00Z');
		expect(formatArticleDate(date, 'ja')).toBe('2026年9月8日');
		expect(formatArticleDate(date, 'en')).toBe('8 September 2026');
	});

	it('reads the list page number defensively', () => {
		expect(articlePage(null)).toBe(1);
		expect(articlePage('3')).toBe(3);
		for (const value of ['0', '-2', '1.5', 'abc', '', '99999999']) {
			expect(articlePage(value)).toBe(1);
		}
	});

	it('resolves Portable Text image assets to public URLs', () => {
		expect(portableImageSource(undefined)).toBeUndefined();
		expect(portableImageSource({})).toBeUndefined();
		expect(portableImageSource({ url: '/agents/a.png' })).toBe('/agents/a.png');
		expect(portableImageSource({ url: 'https://cdn.example/a.png' })).toBe(
			'https://cdn.example/a.png'
		);
		expect(portableImageSource({ _ref: 'editorial/a b.png' })).toBe(
			'/_emdash/api/media/file/editorial/a%20b.png'
		);
	});

	it('builds privacy-enhanced YouTube embed URLs for valid video ids only', () => {
		expect(youtubeEmbedSource('aqz-KE-bpKQ')).toBe(
			'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0'
		);
		expect(youtubeEmbedSource('aqz-KE-bpKQ', 90)).toBe(
			'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0&start=90'
		);
		expect(youtubeEmbedSource('aqz-KE-bpKQ', -1)).toBe(
			'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0'
		);
		for (const id of [undefined, '', 'short', 'aqz-KE-bpKQ/../x', 'https://evil.example']) {
			expect(youtubeEmbedSource(id)).toBeUndefined();
		}
	});
});

describe('article import from a D1 export', () => {
	const content = JSON.stringify([
		{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Body' }] },
		{ _type: 'image', asset: { url: '/_emdash/api/media/file/editorial/body%20image.png' } }
	]);
	const featured = JSON.stringify({ id: 'media-1', meta: { storageKey: 'cover.png' } });
	function row(overrides: Record<string, unknown>) {
		return {
			id: 'ja-1',
			slug: 'story-ja',
			status: 'published',
			locale: 'ja',
			translation_group: 'ja-1',
			published_at: '2026-09-05T01:00:00.000Z',
			created_at: '2026-09-04T01:00:00.000Z',
			updated_at: '2026-09-06T01:00:00.000Z',
			deleted_at: null,
			title: 'Title',
			excerpt: 'Excerpt',
			category: null,
			content,
			featured_image: featured,
			...overrides
		};
	}

	it('unwraps the result envelope of `wrangler d1 execute --json`', () => {
		expect(exportedRows([{ results: [{ id: 'a' }, { id: 'b' }] }])).toEqual([
			{ id: 'a' },
			{ id: 'b' }
		]);
		expect(exportedRows([{ id: 'a' }])).toEqual([{ id: 'a' }]);
		expect(() => exportedRows({})).toThrow();
	});

	it('links translations by translation group, original first, whatever the slugs', () => {
		const plan = planArticleImport([
			row({ id: 'en-1', slug: 'story-en', locale: 'en', category: 'NEWS' }),
			row({}),
			row({ id: 'ja-2', slug: 'ja-only', translation_group: 'ja-2', featured_image: null }),
			row({ id: 'draft', slug: 'draft', status: 'draft', translation_group: 'draft' }),
			row({ id: 'gone', slug: 'gone', deleted_at: '2026-09-07', translation_group: 'gone' })
		]);

		expect(
			plan.articles.map(({ id, slug, locale, translationOf }) => [id, slug, locale, translationOf])
		).toEqual([
			['ja-1', 'story-ja', 'ja', undefined],
			['ja-2', 'ja-only', 'ja', undefined],
			['en-1', 'story-en', 'en', 'ja-1']
		]);
		expect(plan.articles[0].data).toEqual({
			title: 'Title',
			excerpt: 'Excerpt',
			featured_image: { id: 'media-1', meta: { storageKey: 'cover.png' } },
			content: JSON.parse(content)
		});
		expect(plan.articles[1].data).not.toHaveProperty('featured_image');
		expect(plan.mediaKeys).toEqual(['editorial/body image.png', 'cover.png']);
		expect(plan.dates[0]).toEqual({
			slug: 'story-ja',
			locale: 'ja',
			publishedAt: '2026-09-05T01:00:00.000Z',
			createdAt: '2026-09-04T01:00:00.000Z',
			updatedAt: '2026-09-06T01:00:00.000Z'
		});
		expect(plan.warnings).toEqual([
			'Skipped 2 unpublished or deleted rows',
			"Columns without a field in this site's collection: category"
		]);
	});

	it('rejects rows it cannot import faithfully', () => {
		expect(() => planArticleImport([row({ locale: 'fr' })])).toThrow('Unsupported locale');
		expect(() => planArticleImport([row({}), row({ id: 'ja-9' })])).toThrow('Duplicate article');
		expect(() => planArticleImport([row({}), row({ id: 'ja-9', slug: 'other' })])).toThrow(
			'two "ja" articles'
		);
		expect(() => planArticleImport([row({ content: '{' })])).toThrow('Invalid JSON in content');
		expect(() => planArticleImport([row({ content: 'null' })])).toThrow('no Portable Text');
	});
});
