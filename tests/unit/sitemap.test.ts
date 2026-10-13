import { describe, expect, it } from 'vitest';

import { pickArticles } from '../../src/cms/articles';
import { STATIC_PAGE_PATHS, buildSitemap, sitemapPages } from '../../src/cms/sitemap';
import { absoluteUrl } from '../../src/site';

describe('article teasers', () => {
	const articles = ['a', 'b', 'c', 'd'].map((slug) => ({ slug, title: slug, excerpt: '' }));

	it('shows at most three articles and leaves out the one being read', () => {
		expect(pickArticles(articles).map(({ slug }) => slug)).toEqual(['a', 'b', 'c']);
		expect(pickArticles(articles, 'b').map(({ slug }) => slug)).toEqual(['a', 'c', 'd']);
		expect(pickArticles(articles.slice(0, 1), 'a')).toEqual([]);
		expect(pickArticles([])).toEqual([]);
	});
});

describe('absolute URLs', () => {
	it('resolves site paths and keeps absolute URLs', () => {
		expect(absoluteUrl('/agents/a.png')).toBe('https://www.cauchye.com/agents/a.png');
		expect(absoluteUrl('/_emdash/api/media/file/a%20b.png')).toBe(
			'https://www.cauchye.com/_emdash/api/media/file/a%20b.png'
		);
		expect(absoluteUrl('https://cdn.example/a.png')).toBe('https://cdn.example/a.png');
	});
});

describe('sitemap', () => {
	const updatedAt = new Date('2026-09-08T03:00:00Z');

	it('lists only the static pages while no article is published', () => {
		const pages = sitemapPages([]);
		expect(pages).toHaveLength(STATIC_PAGE_PATHS.length);
		expect(pages[0].paths).toEqual({ en: '/en', ja: '/ja' });
		expect(buildSitemap(pages)).not.toContain('/articles');
	});

	it('joins translations by translation group and lists the article list per locale', () => {
		const pages = sitemapPages([
			{ locale: 'ja', slug: 'kiji', translationGroup: 'g1', updatedAt },
			{ locale: 'en', slug: 'story', translationGroup: 'g1' },
			{ locale: 'ja', slug: 'ja-only', translationGroup: 'g2' }
		]).slice(STATIC_PAGE_PATHS.length);
		expect(pages).toEqual([
			{ paths: { ja: '/ja/articles', en: '/en/articles' } },
			{
				paths: { ja: '/ja/articles/kiji', en: '/en/articles/story' },
				lastmod: { ja: updatedAt }
			},
			{ paths: { ja: '/ja/articles/ja-only' }, lastmod: {} }
		]);
	});

	it('leaves the article list of a locale without articles out', () => {
		const xml = buildSitemap(sitemapPages([{ locale: 'ja', slug: 'ja-only' }]));
		expect(xml).toContain('<loc>https://www.cauchye.com/ja/articles</loc>');
		expect(xml).not.toContain('https://www.cauchye.com/en/articles');
	});

	it('writes a url per locale with hreflang alternates', () => {
		const xml = buildSitemap([
			{ paths: { en: '/en/articles/a&b', ja: '/ja/articles/kiji' }, lastmod: { ja: updatedAt } },
			{ paths: { ja: '/ja/articles/ja-only' } }
		]);
		expect(xml).toBe(
			[
				'<?xml version="1.0" encoding="UTF-8"?>',
				'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
				'  <url>',
				'    <loc>https://www.cauchye.com/en/articles/a&amp;b</loc>',
				'    <xhtml:link rel="alternate" hreflang="en" href="https://www.cauchye.com/en/articles/a&amp;b" />',
				'    <xhtml:link rel="alternate" hreflang="ja" href="https://www.cauchye.com/ja/articles/kiji" />',
				'    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.cauchye.com/en/articles/a&amp;b" />',
				'  </url>',
				'  <url>',
				'    <loc>https://www.cauchye.com/ja/articles/kiji</loc>',
				'    <lastmod>2026-09-08T03:00:00.000Z</lastmod>',
				'    <xhtml:link rel="alternate" hreflang="en" href="https://www.cauchye.com/en/articles/a&amp;b" />',
				'    <xhtml:link rel="alternate" hreflang="ja" href="https://www.cauchye.com/ja/articles/kiji" />',
				'    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.cauchye.com/en/articles/a&amp;b" />',
				'  </url>',
				'  <url>',
				'    <loc>https://www.cauchye.com/ja/articles/ja-only</loc>',
				'    <xhtml:link rel="alternate" hreflang="ja" href="https://www.cauchye.com/ja/articles/ja-only" />',
				'    <xhtml:link rel="alternate" hreflang="x-default" href="https://www.cauchye.com/ja/articles/ja-only" />',
				'  </url>',
				'</urlset>'
			].join('\n')
		);
	});
});
