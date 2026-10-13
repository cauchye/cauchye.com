import { describe, expect, it } from 'vitest';

import { type ArticleSummary, pickRelatedArticles } from '../../src/cms/articles';
import { buildRssFeed, feedArticles, feedPath } from '../../src/cms/rss';

function article(slug: string, publishedAt?: string, tags?: string[]): ArticleSummary {
	return {
		slug,
		title: `Title of ${slug}`,
		excerpt: '',
		publishedAt: publishedAt ? new Date(publishedAt) : undefined,
		tags
	};
}

describe('RSS feed', () => {
	const feed = {
		title: 'CAUCHYE — Articles',
		description: 'Articles & notes',
		path: '/en/articles',
		feedPath: feedPath('en'),
		language: 'en'
	} as const;

	it('names the feed of each language and of all languages', () => {
		expect(feedPath()).toBe('/rss.xml');
		expect(feedPath('ja')).toBe('/ja/rss.xml');
	});

	it('lists articles with absolute URLs and RFC 822 dates', () => {
		const xml = buildRssFeed(feed, [
			{
				...article('first', '2026-10-13T15:00:00Z', ['ai-agents']),
				excerpt: 'Q&A <draft>',
				locale: 'en'
			},
			{ ...article('undated'), locale: 'ja' }
		]);
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"')).toBe(true);
		expect(xml).toContain('<link>https://www.cauchye.com/en/articles</link>');
		expect(xml).toContain('<description>Articles &amp; notes</description>');
		expect(xml).toContain('<language>en</language>');
		expect(xml).toContain('<lastBuildDate>Tue, 13 Oct 2026 15:00:00 GMT</lastBuildDate>');
		expect(xml).toContain(
			'<atom:link href="https://www.cauchye.com/en/rss.xml" rel="self" type="application/rss+xml" />'
		);
		expect(xml).toContain('<link>https://www.cauchye.com/en/articles/first</link>');
		expect(xml).toContain(
			'<guid isPermaLink="true">https://www.cauchye.com/en/articles/first</guid>'
		);
		expect(xml).toContain('<description>Q&amp;A &lt;draft&gt;</description>');
		expect(xml).toContain('<pubDate>Tue, 13 Oct 2026 15:00:00 GMT</pubDate>');
		expect(xml).toContain('<category>ai-agents</category>');
		expect(xml).toContain('<link>https://www.cauchye.com/ja/articles/undated</link>');
		expect(xml.match(/<pubDate>/g)).toHaveLength(1);
	});

	it('stays a valid feed without articles', () => {
		const xml = buildRssFeed({ ...feed, language: undefined }, []);
		expect(xml).toContain('<channel>');
		expect(xml).not.toContain('<item>');
		expect(xml).not.toContain('<language>');
		expect(xml).not.toContain('<lastBuildDate>');
		expect(xml.endsWith('</channel>\n</rss>')).toBe(true);
	});

	it('merges the languages newest first', () => {
		const merged = feedArticles(
			{
				en: [article('en-new', '2026-10-03T00:00:00Z'), article('en-old', '2026-10-01T00:00:00Z')],
				ja: [article('ja-mid', '2026-10-02T00:00:00Z'), article('ja-undated')]
			},
			3
		);
		expect(merged.map(({ locale, slug }) => `${locale}/${slug}`)).toEqual([
			'en/en-new',
			'ja/ja-mid',
			'en/en-old'
		]);
	});
});

describe('related articles', () => {
	// Newest first, as the article list is.
	const articles = [
		article('newest', undefined, ['video']),
		article('two-shared', undefined, ['ai-agents', 'governance', 'cost']),
		article('untagged'),
		article('one-shared', undefined, ['governance']),
		article('also-one-shared', undefined, ['ai-agents']),
		article('current', undefined, ['ai-agents', 'governance'])
	];
	const slugs = (tags: string[], exclude?: string, count?: number) => {
		const { articles: picked, matched } = pickRelatedArticles(tags, articles, exclude, count);
		return [picked.map(({ slug }) => slug), matched];
	};

	it('ranks by shared tags, then by recency, without the article being read', () => {
		expect(slugs(['ai-agents', 'governance'], 'current')).toEqual([
			['two-shared', 'one-shared', 'also-one-shared'],
			3
		]);
	});

	it('fills up with the newest articles when too few share a tag', () => {
		expect(slugs(['cost'], 'current')).toEqual([['two-shared', 'newest', 'untagged'], 1]);
		expect(slugs(['video'], 'newest', 2)).toEqual([['two-shared', 'untagged'], 0]);
	});

	it('falls back to the newest articles for an article without tags', () => {
		expect(slugs([], 'current')).toEqual([['newest', 'two-shared', 'untagged'], 0]);
		expect(pickRelatedArticles(['video'], [])).toEqual({ articles: [], matched: 0 });
	});
});
