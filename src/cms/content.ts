import type { AstroGlobal } from 'astro';
import { getEmDashCollection, getEmDashEntry, getTranslations } from 'emdash';

import { type Dictionary, type Locale, getDictionary } from '../i18n';
import type { Partner, PartnerPlacement } from '../partners';
import {
	ARTICLES_PER_PAGE,
	ARTICLE_TEASER_COUNT,
	type ArticleEntry,
	type ArticleSummary,
	resolveArticle,
	resolveArticles
} from './articles';
import type { SitemapArticle } from './sitemap';
import { type CmsEntry, type Faq, mergePageCopy, resolveFaqs, resolvePartners } from './resolve';
import type { FaqPage } from './schema';

type Collection = 'pages' | 'faqs' | 'partners';

// Public pages only ever read published entries in the requested locale. A failed lookup is
// logged and reported as an empty collection so the page renders from the bundled content.
async function publishedEntries(
	Astro: AstroGlobal,
	collection: Collection,
	locale: Locale
): Promise<CmsEntry[]> {
	try {
		const { entries, cacheHint, error } = await getEmDashCollection(collection, {
			locale,
			status: 'published'
		});
		if (error) {
			console.error('EmDash content lookup failed', { collection, locale, error });
			return [];
		}
		if (Astro.cache?.enabled) Astro.cache.set(cacheHint);
		// `entry.id` is locale-qualified (`ja/home`); the bare slug identifies the entry.
		return entries.map((entry) => ({
			slug: entry.data.slug ?? '',
			data: entry.data as unknown as Record<string, unknown>
		}));
	} catch (error) {
		console.error('EmDash content lookup failed', { collection, locale, error });
		return [];
	}
}

export async function getMessages(Astro: AstroGlobal, locale: Locale): Promise<Dictionary> {
	return mergePageCopy(getDictionary(locale), await publishedEntries(Astro, 'pages', locale));
}

export async function getFaqs(
	Astro: AstroGlobal,
	locale: Locale,
	page: FaqPage,
	messages: Dictionary
): Promise<Faq[]> {
	return resolveFaqs(messages, page, await publishedEntries(Astro, 'faqs', locale));
}

export async function getPartners(
	Astro: AstroGlobal,
	locale: Locale,
	placement: PartnerPlacement
): Promise<Partner[]> {
	return resolvePartners(locale, placement, await publishedEntries(Astro, 'partners', locale));
}

export interface ArticleList {
	articles: ArticleSummary[];
	hasMore: boolean;
}

// One page of published articles, newest first. A failed lookup reads as an empty list.
export async function getArticles(
	Astro: AstroGlobal,
	locale: Locale,
	page = 1,
	pageSize = ARTICLES_PER_PAGE
): Promise<ArticleList> {
	try {
		const { entries, cacheHint, error, hasMore } = await getEmDashCollection('articles', {
			locale,
			status: 'published',
			limit: pageSize,
			offset: (page - 1) * pageSize,
			orderBy: { published_at: 'desc' }
		});
		if (error) {
			console.error('EmDash content lookup failed', { collection: 'articles', locale, error });
			return { articles: [], hasMore: false };
		}
		if (Astro.cache?.enabled) Astro.cache.set(cacheHint);
		return {
			articles: resolveArticles(locale, entries as unknown as ArticleEntry[]),
			hasMore: hasMore ?? false
		};
	} catch (error) {
		console.error('EmDash content lookup failed', { collection: 'articles', locale, error });
		return { articles: [], hasMore: false };
	}
}

const latestArticles = new WeakMap<Request, Map<Locale, Promise<ArticleSummary[]>>>();

// The newest published articles, read from D1 once per request. The navigation link and
// every teaser section of a page share this one lookup; it holds one article more than a
// teaser shows, so the article being read can be left out.
export function getLatestArticles(Astro: AstroGlobal, locale: Locale): Promise<ArticleSummary[]> {
	let byLocale = latestArticles.get(Astro.request);
	if (!byLocale) latestArticles.set(Astro.request, (byLocale = new Map()));
	let articles = byLocale.get(locale);
	if (!articles) {
		articles = getArticles(Astro, locale, 1, ARTICLE_TEASER_COUNT + 1).then(
			(list) => list.articles
		);
		byLocale.set(locale, articles);
	}
	return articles;
}

export async function hasArticles(Astro: AstroGlobal, locale: Locale): Promise<boolean> {
	return (await getLatestArticles(Astro, locale)).length > 0;
}

// Every published article of a locale, for the sitemap. A failed lookup reads as none.
export async function getSitemapArticles(locale: Locale): Promise<SitemapArticle[]> {
	try {
		const { entries, error } = await getEmDashCollection('articles', {
			locale,
			status: 'published',
			orderBy: { published_at: 'desc' }
		});
		if (error) {
			console.error('EmDash content lookup failed', { collection: 'articles', locale, error });
			return [];
		}
		return (entries as unknown as ArticleEntry[]).flatMap((entry) => {
			const article = resolveArticle(locale, entry);
			if (!article) return [];
			const { translationGroup, updatedAt } = entry.data;
			return {
				locale,
				slug: article.slug,
				translationGroup: typeof translationGroup === 'string' ? translationGroup : undefined,
				updatedAt: updatedAt instanceof Date ? updatedAt : article.publishedAt
			};
		});
	} catch (error) {
		console.error('EmDash content lookup failed', { collection: 'articles', locale, error });
		return [];
	}
}

export interface Article extends ArticleSummary {
	// EmDash's id of the entry, which its translations are looked up by.
	entryId?: string;
	content: unknown[];
}

// A published article written in the requested locale. EmDash falls back to the default
// locale for a missing translation; that is reported as not found, so `/ja/...` never
// serves an English article.
export async function getArticle(
	Astro: AstroGlobal,
	locale: Locale,
	slug: string
): Promise<Article | undefined> {
	try {
		const { entry, cacheHint, error, fallbackLocale } = await getEmDashEntry('articles', slug, {
			locale
		});
		// A missing entry is reported as an error too; only real failures are worth a log line.
		if (error && error.name !== 'LiveEntryNotFoundError') {
			console.error('EmDash content lookup failed', { collection: 'articles', locale, error });
		}
		if (error || !entry || fallbackLocale || entry.data.status !== 'published') return undefined;
		if (Astro.cache?.enabled) Astro.cache.set(cacheHint);

		const summary = resolveArticle(locale, entry as unknown as ArticleEntry);
		if (!summary) return undefined;
		const content = entry.data.content as unknown;
		const entryId = (entry.data as { id?: unknown }).id;
		return {
			...summary,
			entryId: typeof entryId === 'string' ? entryId : undefined,
			content: Array.isArray(content) ? content : []
		};
	} catch (error) {
		console.error('EmDash content lookup failed', { collection: 'articles', locale, error });
		return undefined;
	}
}

// Slug of the article's published translation. Translations are linked by EmDash's
// translation group, not by slug: the two languages of an article may use different slugs.
export async function getArticleTranslationSlug(
	article: Article,
	locale: Locale
): Promise<string | undefined> {
	if (!article.entryId) return undefined;
	try {
		const { translations, error } = await getTranslations('articles', article.entryId);
		if (error) {
			console.error('EmDash content lookup failed', { collection: 'articles', locale, error });
			return undefined;
		}
		const translation = translations.find(
			(candidate) => candidate.locale === locale && candidate.status === 'published'
		);
		return translation?.slug ?? undefined;
	} catch (error) {
		console.error('EmDash content lookup failed', { collection: 'articles', locale, error });
		return undefined;
	}
}
