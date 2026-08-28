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

export const d6e = {
	url: 'https://www.d6e.ai',
	docsUrl: 'https://docs.d6e.ai',
	gatewayUrl: 'https://gateway.d6e.ai'
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
