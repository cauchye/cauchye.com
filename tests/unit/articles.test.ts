import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { buildSeed } from '../../scripts/build-seed';
import {
	type ArticleEntry,
	articlePage,
	articleSlug,
	formatArticleDate,
	portableImageSource,
	resolveArticle,
	resolveArticles
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
});
