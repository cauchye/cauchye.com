import { type Locale, locales } from '../i18n';
import { absoluteUrl } from '../site';

// Pages that exist in every locale, as paths under `/<locale>`.
export const STATIC_PAGE_PATHS = [
	'',
	'/business/it-ai',
	'/business/it-ai/agent-adoption',
	'/business/it-ai/solution-development',
	'/business/corporate-advisory',
	'/contact',
	'/book'
] as const;

export interface SitemapArticle {
	locale: Locale;
	slug: string;
	// Shared by the translations of one article.
	translationGroup?: string;
	updatedAt?: Date;
}

// One page with the path of each locale it is published in.
export interface SitemapPage {
	paths: Partial<Record<Locale, string>>;
	lastmod?: Partial<Record<Locale, Date>>;
}

// The static pages, then the article list and articles of each locale that has any.
// Translations are joined by translation group: their slugs may differ.
export function sitemapPages(articles: readonly SitemapArticle[]): SitemapPage[] {
	const everyLocale = (path: string): SitemapPage['paths'] =>
		Object.fromEntries(locales.map((locale) => [locale, `/${locale}${path}`]));
	const pages: SitemapPage[] = STATIC_PAGE_PATHS.map((path) => ({ paths: everyLocale(path) }));
	if (articles.length === 0) return pages;

	const list: SitemapPage = { paths: {} };
	const groups = new Map<string, SitemapPage>();
	for (const article of articles) {
		list.paths[article.locale] = `/${article.locale}/articles`;
		const key = article.translationGroup ?? `${article.locale}/${article.slug}`;
		let page = groups.get(key);
		if (!page) groups.set(key, (page = { paths: {}, lastmod: {} }));
		page.paths[article.locale] = `/${article.locale}/articles/${article.slug}`;
		if (article.updatedAt) page.lastmod![article.locale] = article.updatedAt;
	}
	return [...pages, list, ...groups.values()];
}

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

// A `<url>` per locale of each page, each naming all of the page's locales as alternates.
export function buildSitemap(pages: readonly SitemapPage[]): string {
	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
	];
	for (const page of pages) {
		const published = locales.filter((locale) => page.paths[locale]);
		const alternates = published.map(
			(locale) => [locale, escapeXml(absoluteUrl(page.paths[locale]!))] as const
		);
		// English is the default; a page without it falls back to the language it has.
		const fallback = alternates.find(([locale]) => locale === 'en') ?? alternates[0];
		for (const [locale, url] of alternates) {
			lines.push('  <url>', `    <loc>${url}</loc>`);
			const lastmod = page.lastmod?.[locale];
			if (lastmod) lines.push(`    <lastmod>${lastmod.toISOString()}</lastmod>`);
			for (const [hreflang, href] of alternates) {
				lines.push(`    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`);
			}
			lines.push(
				`    <xhtml:link rel="alternate" hreflang="x-default" href="${fallback[1]}" />`,
				'  </url>'
			);
		}
	}
	lines.push('</urlset>');
	return lines.join('\n');
}
