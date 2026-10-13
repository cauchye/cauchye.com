import type { Locale } from './i18n';

export const partnerPlacements = ['it-ai', 'corporate-advisory'] as const;
export type PartnerPlacement = (typeof partnerPlacements)[number];

export interface Partner {
	name: string;
	logo: string;
	site: string;
	logoClass?: string;
}

export interface PartnerDefinition {
	id: string;
	name: Record<Locale, string>;
	logo: string;
	site: string;
	logoClass: string;
	placements: readonly PartnerPlacement[];
}

// Bundled partner list. It seeds the EmDash `partners` collection and is the fallback when
// the CMS has no published partners for a locale.
export const partnerDefinitions: readonly PartnerDefinition[] = [
	{
		id: 'kyoto-social-innovation-center',
		name: {
			en: 'Kyoto University Social Innovation Center',
			ja: '京都大学ソーシャルイノベーションセンター'
		},
		logo: '/partners/kyoto-social-innovation-center.png',
		site: 'https://innovationkyoto.org/',
		logoClass: 'h-14 w-full invert',
		placements: ['it-ai']
	},
	{
		id: 'polipoli',
		name: { en: 'PoliPoli, Inc.', ja: '株式会社PoliPoli' },
		logo: '/partners/polipoli.png',
		site: 'https://www.polipoli.work/',
		logoClass: 'h-10 w-full',
		placements: ['it-ai']
	},
	{
		id: 'yanagisawa-accounting',
		name: { en: 'Yanagisawa and Company', ja: '柳澤国際税務会計事務所' },
		logo: '/partners/yanagisawa-accounting.png',
		site: 'https://www.yanagisawa-accounting.com/',
		logoClass: 'h-11 w-full',
		placements: ['it-ai']
	},
	{
		id: 'ethersecurity-stir',
		name: {
			en: 'STIR — Ethersecurity Pacific Holdings Pte. Ltd.',
			ja: 'STIR — Ethersecurity Pacific Holdings Pte. Ltd.'
		},
		logo: '/partners/ethersecurity-stir.svg',
		site: 'https://stir.network/',
		logoClass: 'h-14 w-full',
		placements: ['it-ai']
	},
	{
		id: 'techfund',
		name: { en: 'TECHFUND', ja: 'TECHFUND' },
		logo: '/partners/techfund.png',
		site: 'https://techfund.jp/',
		logoClass: 'h-16 w-full',
		placements: ['it-ai']
	},
	{
		id: 'jp-force',
		name: { en: 'JP-FORCE', ja: 'JP-FORCE' },
		logo: '/partners/jp-force.png',
		site: 'https://www.jp-force.net/',
		logoClass: 'h-14 w-full',
		placements: ['it-ai']
	},
	{
		id: 'minami-aoyama',
		name: { en: 'Minami Aoyama Advisory Group', ja: '南青山アドバイザリーグループ' },
		logo: '/partners/minami-aoyama.png',
		site: 'https://minami-aoyama.jp/',
		logoClass: 'h-12 w-full',
		placements: ['it-ai']
	},
	{
		id: 'theseus-consulting',
		name: { en: 'Theseus Consulting Inc.', ja: 'テセウスコンサルティング株式会社' },
		logo: '/partners/theseus-consulting.png',
		site: 'https://theseus-grp.com/',
		logoClass: 'h-16 w-full',
		placements: ['it-ai', 'corporate-advisory']
	},
	{
		id: 'runner-up-plus',
		name: { en: 'Runner UP Plus, Inc.', ja: '株式会社Runner UP Plus' },
		logo: '/partners/runner-up-plus.svg',
		site: 'https://runnerup-plus.com/',
		logoClass: 'h-12 w-full',
		placements: ['it-ai']
	},
	{
		id: 'estruth',
		name: { en: 'EsTRUTH', ja: 'EsTRUTH' },
		logo: '/partners/estruth.svg',
		site: 'https://www.estruth.co.jp/',
		logoClass: 'h-14 w-full invert dark:invert-0',
		placements: ['it-ai']
	},
	{
		id: 'morus',
		name: { en: 'Morus', ja: 'Morus' },
		logo: '/partners/morus.svg',
		site: 'https://morus.jp/jp/',
		logoClass: 'h-12 w-full',
		placements: ['it-ai']
	}
];

export function bundledPartners(locale: Locale, placement: PartnerPlacement): Partner[] {
	return partnerDefinitions
		.filter((partner) => partner.placements.includes(placement))
		.map(({ name, logo, site, logoClass }) => ({ name: name[locale], logo, site, logoClass }));
}

// Logo sizing arrives from the CMS as utility classes. Only classes that the bundled list
// already uses exist in the compiled stylesheet, so anything else is dropped.
const LOGO_CLASSES = new Set(partnerDefinitions.flatMap((partner) => partner.logoClass.split(' ')));

export function sanitizeLogoClass(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const classes = value.split(/\s+/).filter((token) => LOGO_CLASSES.has(token));
	return classes.length > 0 ? classes.join(' ') : undefined;
}
