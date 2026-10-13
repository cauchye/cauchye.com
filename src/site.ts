import type { MessageKey } from './i18n';

export const site = {
	legalName: 'CAUCHYE ASIA PTE. LTD.',
	shortName: 'CAUCHYE',
	uen: '202216135Z',
	url: 'https://www.cauchye.com',
	address: {
		street: '105 Cecil Street',
		unit: '#24-02 The Octagon',
		locality: 'Singapore',
		postalCode: '069534',
		country: 'SG'
	},
	foundedYear: 2022
} as const;

// Absolute URL of a path on this site; an already absolute URL is kept.
export function absoluteUrl(path: string): string {
	return new URL(path, site.url).href;
}

// Share image of every page that has none of its own (1200x630, in public/).
export const defaultShareImage = {
	path: '/og-default.png',
	width: 1200,
	height: 630,
	alt: 'CAUCHYE ASIA PTE. LTD.'
} as const;

export const d6e = {
	url: 'https://www.d6e.ai',
	docsUrl: 'https://docs.d6e.ai',
	gatewayUrl: 'https://gateway.d6e.ai'
} as const;

export const fdeMission = {
	url: 'https://fde-mission.cauchye.com'
} as const;

export const addressLines = [
	site.address.street,
	site.address.unit,
	`${site.address.locality} ${site.address.postalCode}`
];

export const navItems = [
	{ path: '/#services', label: 'nav_services' },
	{ path: '/#company', label: 'nav_company' },
	{ path: '/business/it-ai', label: 'nav_ai' },
	{ path: '/business/corporate-advisory', label: 'nav_advisory' }
] as const satisfies ReadonlyArray<{ path: string; label: MessageKey }>;
