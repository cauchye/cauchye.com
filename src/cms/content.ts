import type { AstroGlobal } from 'astro';
import { getEmDashCollection } from 'emdash';

import { type Dictionary, type Locale, getDictionary } from '../i18n';
import type { Partner, PartnerPlacement } from '../partners';
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
