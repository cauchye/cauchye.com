import type { MessageKey } from '../i18n';

// One EmDash `pages` entry per public route and locale. The slug is the CMS identifier;
// routing stays in src/pages.
export const pageSlugs = [
	'home',
	'it-ai',
	'agent-adoption',
	'solution-development',
	'corporate-advisory',
	'contact'
] as const;
export type PageSlug = (typeof pageSlugs)[number];

export const pagePaths: Record<PageSlug, string> = {
	home: '',
	'it-ai': '/business/it-ai',
	'agent-adoption': '/business/it-ai/agent-adoption',
	'solution-development': '/business/it-ai/solution-development',
	'corporate-advisory': '/business/corporate-advisory',
	contact: '/contact'
};

export const pageFields = [
	'title',
	'description',
	'eyebrow',
	'hero_title_lead',
	'hero_title_accent',
	'hero_body'
] as const;
export type PageField = (typeof pageFields)[number];

// Which message each dedicated `pages` field replaces. Everything else a page owns lives in
// its `copy` JSON field, keyed by message key.
export const pageFieldKeys: Record<PageSlug, Partial<Record<PageField, MessageKey>>> = {
	home: {
		title: 'brand_descriptor',
		hero_title_lead: 'hero_title_lead',
		hero_title_accent: 'hero_title_accent',
		hero_body: 'hero_body'
	},
	'it-ai': {
		title: 'ai_meta_title',
		description: 'ai_meta_description',
		eyebrow: 'ai_eyebrow',
		hero_title_lead: 'ai_hero_title_lead',
		hero_title_accent: 'ai_hero_title_accent',
		hero_body: 'ai_hero_body'
	},
	'agent-adoption': {
		title: 'agent_meta_title',
		description: 'agent_meta_description',
		eyebrow: 'agent_eyebrow',
		hero_title_lead: 'agent_hero_title_lead',
		hero_title_accent: 'agent_hero_title_accent',
		hero_body: 'agent_hero_body'
	},
	'solution-development': {
		title: 'development_meta_title',
		description: 'development_meta_description',
		eyebrow: 'development_eyebrow',
		hero_title_lead: 'development_hero_title_lead',
		hero_title_accent: 'development_hero_title_accent',
		hero_body: 'development_hero_body'
	},
	'corporate-advisory': {
		title: 'advisory_meta_title',
		description: 'advisory_meta_description',
		eyebrow: 'advisory_eyebrow',
		hero_title_lead: 'advisory_hero_title_lead',
		hero_title_accent: 'advisory_hero_title_accent',
		hero_body: 'advisory_hero_body'
	},
	contact: {
		title: 'contact_title',
		description: 'contact_body',
		eyebrow: 'contact_eyebrow'
	}
};

export const faqPages = ['agent-adoption', 'solution-development'] as const;
export type FaqPage = (typeof faqPages)[number];

// Message-key prefix of each page's FAQ items (`<prefix>_<n>_q` / `<prefix>_<n>_a`).
export const faqKeyPrefixes: Record<FaqPage, string> = {
	'agent-adoption': 'agent_faq',
	'solution-development': 'ai_faq'
};

const FAQ_ITEM_PATTERN = /^(?:agent|ai)_faq_\d+_[qa]$/;

// Interface strings stay in messages/*.json and are not editable in the CMS.
const UI_PREFIXES = [
	'brand_name',
	'brand_legal_name',
	'nav_',
	'breadcrumb_',
	'locale_',
	'form_',
	'footer_',
	'articles_',
	'contact_cta',
	'cta_',
	'media_',
	// The email landing page is not a CMS page.
	'lp_'
];

// First match wins, so the narrower `ai_` prefixes of the overview page precede the catch-all
// that assigns the remaining `ai_` copy to the solution development page.
const PAGE_PREFIXES: ReadonlyArray<readonly [PageSlug, readonly string[]]> = [
	[
		'home',
		[
			'brand_descriptor',
			'hero_',
			'about_',
			'services_',
			'business_',
			'leader_',
			'member_',
			'company_'
		]
	],
	[
		'it-ai',
		[
			'ai_meta_',
			'ai_eyebrow',
			'ai_hero_',
			'ai_cta_primary',
			'ai_cta_secondary',
			'ai_partners_',
			'ai_offerings_',
			'ai_offering_',
			'ai_overview_cta_',
			'gateway_'
		]
	],
	['agent-adoption', ['agent_']],
	['solution-development', ['development_', 'ai_', 'd6e_foundation_']],
	['corporate-advisory', ['advisory_']],
	['contact', ['contact_']]
];

export type MessageOwner = PageSlug | 'ui' | 'faq';

export function messageOwner(key: string): MessageOwner | undefined {
	if (FAQ_ITEM_PATTERN.test(key)) return 'faq';
	if (UI_PREFIXES.some((prefix) => key.startsWith(prefix))) return 'ui';
	return PAGE_PREFIXES.find(([, prefixes]) =>
		prefixes.some((prefix) => key.startsWith(prefix))
	)?.[0];
}
