import type { Locale } from '../i18n';
import { absoluteUrl } from '../site';
import type { ArticleSummary } from './articles';
import { escapeXml } from './sitemap';

// Articles a feed lists per language, newest first.
export const FEED_ARTICLE_COUNT = 30;

export interface FeedArticle extends ArticleSummary {
	locale: Locale;
}

export interface Feed {
	title: string;
	description: string;
	// Site path of the page the feed belongs to, and of the feed itself.
	path: string;
	feedPath: string;
	// Omitted by the feed that mixes both languages.
	language?: Locale;
}

export function feedPath(locale?: Locale): string {
	return locale ? `/${locale}/rss.xml` : '/rss.xml';
}

// Newest first across languages; undated articles last.
export function feedArticles(
	articlesByLocale: Partial<Record<Locale, readonly ArticleSummary[]>>,
	count = FEED_ARTICLE_COUNT
): FeedArticle[] {
	return (Object.entries(articlesByLocale) as Array<[Locale, readonly ArticleSummary[]]>)
		.flatMap(([locale, articles]) => articles.map((article) => ({ ...article, locale })))
		.sort((left, right) => (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0))
		.slice(0, count);
}

// An RSS 2.0 document. Every URL is absolute; a feed without articles is still valid.
export function buildRssFeed(feed: Feed, articles: readonly FeedArticle[]): string {
	const newest = articles.find((article) => article.publishedAt)?.publishedAt;
	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		'  <channel>',
		`    <title>${escapeXml(feed.title)}</title>`,
		`    <link>${escapeXml(absoluteUrl(feed.path))}</link>`,
		`    <description>${escapeXml(feed.description)}</description>`
	];
	if (feed.language) lines.push(`    <language>${feed.language}</language>`);
	if (newest) lines.push(`    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>`);
	lines.push(
		`    <atom:link href="${escapeXml(absoluteUrl(feed.feedPath))}" rel="self" type="application/rss+xml" />`
	);
	for (const article of articles) {
		const url = escapeXml(absoluteUrl(`/${article.locale}/articles/${article.slug}`));
		lines.push(
			'    <item>',
			`      <title>${escapeXml(article.title)}</title>`,
			`      <link>${url}</link>`,
			`      <guid isPermaLink="true">${url}</guid>`
		);
		if (article.excerpt) {
			lines.push(`      <description>${escapeXml(article.excerpt)}</description>`);
		}
		if (article.publishedAt) {
			lines.push(`      <pubDate>${article.publishedAt.toUTCString()}</pubDate>`);
		}
		for (const tag of article.tags ?? []) {
			lines.push(`      <category>${escapeXml(tag)}</category>`);
		}
		lines.push('    </item>');
	}
	lines.push('  </channel>', '</rss>');
	return lines.join('\n');
}
