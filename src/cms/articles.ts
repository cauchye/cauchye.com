import type { Locale } from '../i18n';
import { type CmsMediaValue, cmsMediaSource, encodeStorageKey } from './resolve';

export const ARTICLES_PER_PAGE = 12;

export interface ArticleImage {
	src: string;
	alt: string;
	width?: number;
	height?: number;
}

export interface ArticleSummary {
	slug: string;
	title: string;
	excerpt: string;
	image?: ArticleImage;
	publishedAt?: Date;
}

// Shape of an `articles` entry as far as these resolvers care. `id` is the locale-qualified
// entry id (`ja/story`); `data.slug` is the bare slug.
export interface ArticleEntry {
	id: string;
	data: Record<string, unknown>;
}

function text(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function dimension(value: unknown): number | undefined {
	return typeof value === 'number' && value > 0 ? value : undefined;
}

export function articleSlug(
	entryId: string,
	dataSlug: string | null | undefined,
	locale: Locale
): string {
	const candidate = (dataSlug?.trim() || entryId).replace(/^\/+/, '');
	const localePrefix = `${locale}/`;
	return candidate.startsWith(localePrefix) ? candidate.slice(localePrefix.length) : candidate;
}

function articleImage(value: unknown, fallbackAlt: string): ArticleImage | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const media = value as CmsMediaValue & { width?: unknown; height?: unknown };
	const src = cmsMediaSource(media);
	if (!src) return undefined;
	return {
		src,
		alt: text(media.alt) ?? fallbackAlt,
		width: dimension(media.width),
		height: dimension(media.height)
	};
}

// An article needs a slug and a title to be listed or linked; anything else is optional.
export function resolveArticle(locale: Locale, entry: ArticleEntry): ArticleSummary | undefined {
	const slug = articleSlug(entry.id, text(entry.data.slug), locale);
	const title = text(entry.data.title);
	if (!slug || !title) return undefined;

	const published = entry.data.publishedAt ?? entry.data.createdAt;
	return {
		slug,
		title,
		excerpt: text(entry.data.excerpt) ?? '',
		image: articleImage(entry.data.featured_image, title),
		publishedAt:
			published instanceof Date && !Number.isNaN(published.getTime()) ? published : undefined
	};
}

// Newest first; undated articles last.
export function resolveArticles(
	locale: Locale,
	entries: readonly ArticleEntry[]
): ArticleSummary[] {
	return entries
		.flatMap((entry) => resolveArticle(locale, entry) ?? [])
		.sort(
			(left, right) => (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0)
		);
}

const DATE_FORMATS: Record<Locale, Intl.DateTimeFormat> = {
	en: new Intl.DateTimeFormat('en-SG', { dateStyle: 'long', timeZone: 'Asia/Singapore' }),
	ja: new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long', timeZone: 'Asia/Tokyo' })
};

export function formatArticleDate(date: Date, locale: Locale): string {
	return DATE_FORMATS[locale].format(date);
}

// `?page=` of the article list: a positive integer, 1 for anything else.
export function articlePage(value: string | null): number {
	if (!value || !/^\d{1,6}$/.test(value)) return 1;
	return Math.max(Number(value), 1);
}

// Public URL of a Portable Text image block's asset.
export function portableImageSource(
	asset: { _ref?: string; url?: string } | null | undefined
): string | undefined {
	if (!asset) return undefined;
	if (asset.url?.startsWith('/') || /^https?:\/\//.test(asset.url ?? '')) return asset.url;

	const storageKey = text(asset.url) ?? text(asset._ref);
	return storageKey ? `/_emdash/api/media/file/${encodeStorageKey(storageKey)}` : undefined;
}
