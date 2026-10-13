// Builds seed/seed.json — the EmDash schema plus the bundled site content — from
// messages/*.json, src/partners.ts, and seed/articles.json. Run `pnpm run seed:build` after
// changing any of them.
import { writeFile } from 'node:fs/promises';

import en from '../messages/en.json' with { type: 'json' };
import ja from '../messages/ja.json' with { type: 'json' };
import importedArticles from '../seed/articles.json' with { type: 'json' };
import {
	type FaqPage,
	type PageSlug,
	faqKeyPrefixes,
	faqPages,
	messageOwner,
	pageFieldKeys,
	pageSlugs
} from '../src/cms/schema.ts';
import { partnerDefinitions } from '../src/partners.ts';

type Messages = Record<string, string>;
type Locale = 'en' | 'ja';

const DEFAULT_LOCALE: Locale = 'en';
const dictionaries: Record<Locale, Messages> = { en, ja };
const locales: Locale[] = ['en', 'ja'];

interface SeedEntry {
	id: string;
	slug: string;
	locale: Locale;
	translationOf?: string;
	status: string;
	data: Record<string, unknown>;
}

// Entries of the default locale carry the base id; translations append the locale and
// point back with `translationOf`.
function localized(
	id: string,
	slug: string,
	locale: Locale,
	data: Record<string, unknown>
): SeedEntry {
	return locale === DEFAULT_LOCALE
		? { id, slug, locale, status: 'published', data }
		: { id: `${id}-${locale}`, slug, locale, translationOf: id, status: 'published', data };
}

function pageData(slug: PageSlug, messages: Messages) {
	const fieldKeys = pageFieldKeys[slug];
	const dedicated = new Set<string>(Object.values(fieldKeys));
	const fields = Object.fromEntries(
		Object.entries(fieldKeys).map(([field, key]) => [field, messages[key]])
	);
	const copy = Object.fromEntries(
		Object.entries(messages).filter(([key]) => messageOwner(key) === slug && !dedicated.has(key))
	);
	return Object.keys(copy).length > 0 ? { ...fields, copy } : fields;
}

function faqItems(page: FaqPage, messages: Messages) {
	const prefix = faqKeyPrefixes[page];
	const items: Array<{ question: string; answer: string }> = [];
	for (let index = 1; messages[`${prefix}_${index}_q`]; index += 1) {
		items.push({
			question: messages[`${prefix}_${index}_q`],
			answer: messages[`${prefix}_${index}_a`]
		});
	}
	return items;
}

const string = (slug: string, label: string, extra: Record<string, unknown> = {}) => ({
	slug,
	label,
	type: 'string',
	...extra
});
const text = (slug: string, label: string, extra: Record<string, unknown> = {}) => ({
	slug,
	label,
	type: 'text',
	...extra
});

export function buildSeed() {
	return {
		$schema: 'https://emdashcms.com/seed.schema.json',
		version: '1',
		defaultLocale: DEFAULT_LOCALE,
		meta: {
			name: 'CAUCHYE ASIA PTE. LTD.',
			description: 'Bilingual corporate site content for cauchye.com',
			author: 'CAUCHYE ASIA PTE. LTD.'
		},
		settings: {
			title: 'CAUCHYE ASIA PTE. LTD.',
			tagline: en.brand_descriptor
		},
		collections: [
			{
				slug: 'pages',
				label: 'Pages',
				labelSingular: 'Page',
				titleField: 'title',
				supports: ['drafts', 'revisions'],
				fields: [
					string('title', 'Title', { required: true, searchable: true }),
					text('description', 'Meta description'),
					string('eyebrow', 'Eyebrow'),
					string('hero_title_lead', 'Hero title (first line)'),
					string('hero_title_accent', 'Hero title (accent line)'),
					text('hero_body', 'Hero body'),
					{ slug: 'copy', label: 'Section copy (message key → text)', type: 'json' }
				]
			},
			{
				slug: 'faqs',
				label: 'FAQs',
				labelSingular: 'FAQ',
				titleField: 'question',
				supports: ['drafts', 'revisions'],
				fields: [
					string('question', 'Question', { required: true, searchable: true }),
					text('answer', 'Answer', { required: true, searchable: true }),
					string('page', `Page (${faqPages.join(' / ')})`, { required: true }),
					{ slug: 'sort_order', label: 'Sort order', type: 'integer' }
				]
			},
			{
				slug: 'partners',
				label: 'Partners',
				labelSingular: 'Partner',
				titleField: 'name',
				supports: ['drafts', 'revisions'],
				fields: [
					string('name', 'Name', { required: true, searchable: true }),
					string('url', 'Website URL', { required: true }),
					{ slug: 'logo', label: 'Logo (uploaded media)', type: 'image' },
					string('logo_path', 'Bundled logo path (used when no logo is uploaded)'),
					string('logo_class', 'Logo size classes'),
					{ slug: 'show_on_it_ai', label: 'Show on IT & AI Solutions', type: 'boolean' },
					{
						slug: 'show_on_corporate_advisory',
						label: 'Show on Corporate Advisory',
						type: 'boolean'
					},
					{ slug: 'sort_order', label: 'Sort order', type: 'integer' }
				]
			},
			// Same shape as fde-mission's `articles`, so entries can move between the two sites.
			{
				slug: 'articles',
				label: 'Articles',
				labelSingular: 'Article',
				urlPattern: '/articles/{slug}',
				titleField: 'title',
				supports: ['drafts', 'revisions', 'seo', 'search'],
				fields: [
					string('title', 'Title', { required: true, searchable: true }),
					text('excerpt', 'Excerpt', { required: true, searchable: true }),
					{ slug: 'featured_image', label: 'Featured image', type: 'image' },
					{
						slug: 'content',
						label: 'Content',
						type: 'portableText',
						required: true,
						searchable: true
					}
				]
			}
		],
		content: {
			pages: pageSlugs.flatMap((slug) =>
				locales.map((locale) =>
					localized(`page-${slug}`, slug, locale, pageData(slug, dictionaries[locale]))
				)
			),
			faqs: faqPages.flatMap((page) =>
				locales.flatMap((locale) =>
					faqItems(page, dictionaries[locale]).map((faq, index) =>
						localized(`faq-${page}-${index + 1}`, `${page}-${index + 1}`, locale, {
							...faq,
							page,
							sort_order: index + 1
						})
					)
				)
			),
			partners: partnerDefinitions.flatMap((partner, index) =>
				locales.map((locale) =>
					localized(`partner-${partner.id}`, partner.id, locale, {
						name: partner.name[locale],
						url: partner.site,
						logo_path: partner.logo,
						logo_class: partner.logoClass,
						show_on_it_ai: partner.placements.includes('it-ai'),
						show_on_corporate_advisory: partner.placements.includes('corporate-advisory'),
						sort_order: index + 1
					})
				)
			),
			// Written by scripts/import-articles.ts; entries already carry their locale links.
			articles: importedArticles.articles as SeedEntry[]
		}
	};
}

export function serializeSeed() {
	return `${JSON.stringify(buildSeed(), null, '\t')}\n`;
}

if (import.meta.main) {
	await writeFile(new URL('../seed/seed.json', import.meta.url), serializeSeed());
}
