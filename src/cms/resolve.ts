import type { Dictionary, Locale, MessageKey } from '../i18n';
import {
	type Partner,
	type PartnerPlacement,
	bundledPartners,
	sanitizeLogoClass
} from '../partners';
import {
	type FaqPage,
	type PageSlug,
	faqKeyPrefixes,
	messageOwner,
	pageFieldKeys,
	pageFields,
	pageSlugs
} from './schema';

// Shape of a published entry as far as these resolvers care: the entry slug and its
// collection fields.
export interface CmsEntry {
	slug: string;
	data: Record<string, unknown>;
}

export interface Faq {
	question: string;
	answer: string;
}

export interface CmsMediaValue {
	id?: string;
	src?: string;
	alt?: string;
	meta?: Record<string, unknown>;
}

function isPageSlug(value: string): value is PageSlug {
	return pageSlugs.includes(value as PageSlug);
}

function text(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

// D1 returns boolean fields as 0/1.
function enabled(value: unknown): boolean {
	return value === true || value === 1;
}

function sortOrder(entry: CmsEntry): number {
	const value = entry.data.sort_order;
	return typeof value === 'number' && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function bySortOrder(entries: readonly CmsEntry[]): CmsEntry[] {
	return [...entries].sort((left, right) => sortOrder(left) - sortOrder(right));
}

// Overlays published `pages` entries on the bundled dictionary. A page can only replace copy
// it owns, so interface strings and other pages' text stay out of reach of a stray key.
export function mergePageCopy(dictionary: Dictionary, entries: readonly CmsEntry[]): Dictionary {
	const merged = { ...dictionary };

	for (const entry of entries) {
		const page = entry.slug;
		if (!isPageSlug(page)) continue;

		const copy = entry.data.copy;
		if (copy && typeof copy === 'object' && !Array.isArray(copy)) {
			for (const [key, value] of Object.entries(copy)) {
				const override = text(value);
				if (override && key in dictionary && messageOwner(key) === page) {
					merged[key as MessageKey] = override;
				}
			}
		}

		for (const field of pageFields) {
			const key = pageFieldKeys[page][field];
			const override = text(entry.data[field]);
			if (key && override) merged[key] = override;
		}
	}

	return merged;
}

export function bundledFaqs(dictionary: Dictionary, page: FaqPage): Faq[] {
	const prefix = faqKeyPrefixes[page];
	const faqs: Faq[] = [];
	for (let index = 1; ; index += 1) {
		const question = dictionary[`${prefix}_${index}_q` as MessageKey];
		const answer = dictionary[`${prefix}_${index}_a` as MessageKey];
		if (!question || !answer) return faqs;
		faqs.push({ question, answer });
	}
}

export function resolveFaqs(
	dictionary: Dictionary,
	page: FaqPage,
	entries: readonly CmsEntry[]
): Faq[] {
	const faqs = bySortOrder(entries.filter((entry) => entry.data.page === page)).flatMap((entry) => {
		const question = text(entry.data.question);
		const answer = text(entry.data.answer);
		return question && answer ? [{ question, answer }] : [];
	});
	return faqs.length > 0 ? faqs : bundledFaqs(dictionary, page);
}

export function encodeStorageKey(storageKey: string): string {
	return storageKey.split('/').map(encodeURIComponent).join('/');
}

// Public URL of an EmDash image field. Uploaded media is served from R2 through EmDash's
// media endpoint.
export function cmsMediaSource(media: CmsMediaValue | null | undefined): string | undefined {
	if (!media) return undefined;
	if (media.src?.startsWith('/') || /^https?:\/\//.test(media.src ?? '')) return media.src;

	const storageKey = text(media.meta?.storageKey);
	if (storageKey) return `/_emdash/api/media/file/${encodeStorageKey(storageKey)}`;
	if (media.id) return `/_emdash/api/media/file/${encodeURIComponent(media.id)}`;
	return undefined;
}

function bundledLogoPath(value: unknown): string | undefined {
	const path = text(value);
	return path && /^\/(?!\/)/.test(path) ? path : undefined;
}

function externalUrl(value: unknown): string | undefined {
	const url = text(value);
	return url && /^https?:\/\//.test(url) ? url : undefined;
}

const PLACEMENT_FIELDS: Record<PartnerPlacement, string> = {
	'it-ai': 'show_on_it_ai',
	'corporate-advisory': 'show_on_corporate_advisory'
};

export function resolvePartners(
	locale: Locale,
	placement: PartnerPlacement,
	entries: readonly CmsEntry[]
): Partner[] {
	// No published partner at all means the CMS is not populated for this locale; a populated
	// CMS is authoritative, including when it leaves a page without partners.
	if (entries.length === 0) return bundledPartners(locale, placement);

	return bySortOrder(
		entries.filter((entry) => enabled(entry.data[PLACEMENT_FIELDS[placement]]))
	).flatMap((entry) => {
		const name = text(entry.data.name);
		const logo =
			cmsMediaSource(entry.data.logo as CmsMediaValue | undefined) ??
			bundledLogoPath(entry.data.logo_path);
		const site = externalUrl(entry.data.url);
		if (!name || !logo || !site) return [];
		return [{ name, logo, site, logoClass: sanitizeLogoClass(entry.data.logo_class) }];
	});
}
