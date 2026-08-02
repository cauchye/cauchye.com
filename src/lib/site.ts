import { m } from '$lib/paraglide/messages';

/**
 * Facts about the company that are not translated. Edit here, nowhere else —
 * the header, footer, company section and structured data all read from this.
 */
export const site = {
	legalName: 'CAUCHYE ASIA PTE. LTD.',
	shortName: 'CAUCHYE',
	// The apex redirects here, so this is the canonical form for og:url and JSON-LD.
	url: 'https://www.cauchye.com',
	address: {
		street: '105 Cecil Street',
		unit: '#24-02 The Octagon',
		locality: 'Singapore',
		postalCode: '069534',
		country: 'SG'
	},
	foundedYear: 2024
} as const;

/** Our own product, hosted separately. */
export const d6e = {
	url: 'https://www.d6e.ai',
	docsUrl: 'https://docs.d6e.ai'
} as const;

export const addressLines = [
	site.address.street,
	site.address.unit,
	`${site.address.locality} ${site.address.postalCode}`
];

/**
 * Single source of truth for navigation. Labels are functions so they resolve
 * against the active locale at render time rather than at module load.
 */
export const navItems = [
	{ hash: '#services', label: () => m.nav_services() },
	{ hash: '#leadership', label: () => m.nav_leadership() },
	{ hash: '#about', label: () => m.nav_about() },
	{ hash: '#company', label: () => m.nav_company() }
] as const;
