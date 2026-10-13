import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import en from '../../messages/en.json';
import ja from '../../messages/ja.json';
import { buildSeed } from '../../scripts/build-seed';
import {
	type CmsEntry,
	bundledFaqs,
	cmsMediaSource,
	mergePageCopy,
	resolveFaqs,
	resolvePartners
} from '../../src/cms/resolve';
import { messageOwner, pageFieldKeys, pageSlugs } from '../../src/cms/schema';
import type { Dictionary } from '../../src/i18n';
import { bundledPartners } from '../../src/partners';

const dictionaries: Record<'en' | 'ja', Dictionary> = { en, ja };
const seed = buildSeed();

function seeded(collection: keyof typeof seed.content, locale: 'en' | 'ja'): CmsEntry[] {
	return seed.content[collection]
		.filter((entry) => entry.locale === locale)
		.map((entry) => ({ slug: entry.slug, data: entry.data as Record<string, unknown> }));
}

describe('message ownership', () => {
	it('assigns every message to the interface, a page, or the FAQ collection', () => {
		expect(Object.keys(en).filter((key) => messageOwner(key) === undefined)).toEqual([]);
	});

	it('maps dedicated page fields only to messages that page owns', () => {
		for (const slug of pageSlugs) {
			for (const key of Object.values(pageFieldKeys[slug])) {
				expect(messageOwner(key)).toBe(slug);
			}
		}
	});
});

describe('seed', () => {
	it('matches the committed seed file', async () => {
		const committed = JSON.parse(
			await readFile(new URL('../../seed/seed.json', import.meta.url), 'utf8')
		);
		expect(committed).toEqual(JSON.parse(JSON.stringify(seed)));
	});

	it('publishes every page, FAQ, and partner in both locales', () => {
		for (const locale of ['en', 'ja'] as const) {
			expect(seeded('pages', locale).map((entry) => entry.slug)).toEqual([...pageSlugs]);
			expect(seeded('faqs', locale)).toHaveLength(6);
			expect(seeded('partners', locale)).toHaveLength(11);
		}
		for (const entries of Object.values(seed.content)) {
			expect(entries.every((entry) => entry.status === 'published')).toBe(true);
		}
	});

	it('reproduces the bundled site content when rendered from the CMS', () => {
		for (const locale of ['en', 'ja'] as const) {
			const dictionary = dictionaries[locale];
			// Blank every CMS-owned message so the assertion proves the seed carries the copy.
			const blank = Object.fromEntries(
				Object.entries(dictionary).map(([key, value]) => [
					key,
					messageOwner(key) === 'ui' || messageOwner(key) === 'faq' ? value : ''
				])
			) as Dictionary;
			expect(mergePageCopy(blank, seeded('pages', locale))).toEqual(dictionary);

			for (const page of ['agent-adoption', 'solution-development'] as const) {
				expect(resolveFaqs(blank, page, seeded('faqs', locale))).toEqual(
					bundledFaqs(dictionary, page)
				);
			}
			for (const placement of ['it-ai', 'corporate-advisory'] as const) {
				expect(resolvePartners(locale, placement, seeded('partners', locale))).toEqual(
					bundledPartners(locale, placement)
				);
			}
		}
	});
});

describe('CMS content resolution', () => {
	it('falls back to bundled content while the CMS is empty', () => {
		expect(mergePageCopy(ja, [])).toEqual(ja);
		expect(resolveFaqs(ja, 'agent-adoption', [])).toEqual(bundledFaqs(ja, 'agent-adoption'));
		expect(resolvePartners('ja', 'it-ai', [])).toEqual(bundledPartners('ja', 'it-ai'));
	});

	it('lets a page replace only the copy it owns', () => {
		const merged = mergePageCopy(en, [
			{
				slug: 'home',
				data: {
					hero_title_lead: 'Edited lead',
					hero_body: '   ',
					copy: {
						about_title: 'Edited about',
						nav_contact: 'Hijacked',
						advisory_cta_title: 'Hijacked',
						unknown_key: 'Ignored',
						leader_name: 42
					}
				}
			},
			{ slug: 'not-a-page', data: { hero_title_lead: 'Ignored' } }
		]);

		expect(merged.hero_title_lead).toBe('Edited lead');
		expect(merged.about_title).toBe('Edited about');
		expect(merged.hero_body).toBe(en.hero_body);
		expect(merged.nav_contact).toBe(en.nav_contact);
		expect(merged.advisory_cta_title).toBe(en.advisory_cta_title);
		expect(merged.leader_name).toBe(en.leader_name);
		expect(merged).not.toHaveProperty('unknown_key');
	});

	it('orders FAQs within their page and skips incomplete ones', () => {
		const faqs = resolveFaqs(en, 'agent-adoption', [
			{
				slug: 'b',
				data: { page: 'agent-adoption', question: 'Second', answer: 'B', sort_order: 2 }
			},
			{ slug: 'c', data: { page: 'agent-adoption', question: 'No answer', sort_order: 0 } },
			{ slug: 'x', data: { page: 'solution-development', question: 'Other', answer: 'X' } },
			{ slug: 'a', data: { page: 'agent-adoption', question: 'First', answer: 'A', sort_order: 1 } }
		]);
		expect(faqs).toEqual([
			{ question: 'First', answer: 'A' },
			{ question: 'Second', answer: 'B' }
		]);
	});

	it('prefers uploaded partner logos and rejects unsafe values', () => {
		const partner = (data: Record<string, unknown>): CmsEntry => ({
			slug: 'partner',
			data: { name: 'Partner', url: 'https://example.com/', show_on_it_ai: 1, ...data }
		});
		const partners = resolvePartners('en', 'it-ai', [
			partner({
				sort_order: 2,
				logo: { id: 'media-id', meta: { storageKey: 'logos/partner logo.png' } },
				logo_path: '/partners/morus.svg',
				logo_class: 'h-12 w-full fixed'
			}),
			partner({ sort_order: 1, name: 'Bundled', logo_path: '/partners/morus.svg' }),
			partner({ name: 'Hidden', show_on_it_ai: 0, logo_path: '/partners/morus.svg' }),
			partner({ name: 'Script URL', url: 'javascript:alert(1)', logo_path: '/partners/morus.svg' }),
			partner({ name: 'Remote path', logo_path: '//evil.example/logo.svg' }),
			partner({ name: 'No logo' })
		]);

		expect(partners).toEqual([
			{
				name: 'Bundled',
				logo: '/partners/morus.svg',
				site: 'https://example.com/',
				logoClass: undefined
			},
			{
				name: 'Partner',
				logo: '/_emdash/api/media/file/logos/partner%20logo.png',
				site: 'https://example.com/',
				logoClass: 'h-12 w-full'
			}
		]);
		expect(resolvePartners('en', 'corporate-advisory', [partner({})])).toEqual([]);
	});

	it('resolves EmDash media to its public URL', () => {
		expect(cmsMediaSource(undefined)).toBeUndefined();
		expect(cmsMediaSource({ src: '/partners/morus.svg' })).toBe('/partners/morus.svg');
		expect(cmsMediaSource({ src: 'https://cdn.example/logo.png' })).toBe(
			'https://cdn.example/logo.png'
		);
		expect(cmsMediaSource({ id: 'a/b' })).toBe('/_emdash/api/media/file/a%2Fb');
	});
});
