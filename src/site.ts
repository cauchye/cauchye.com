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

// Official CauchyE ASIA accounts on other media, with the latest posts of each (all in
// Japanese). The footer, the article list, and the Organization `sameAs` read from here.
export const officialMedia = [
	{
		id: 'note',
		label: 'note',
		url: 'https://note.com/cauchye_asia',
		posts: [
			{
				title: '20年動かなかった壁を、Claudeは約3週間で越えた。でも作者は18万行を読み切れなかった',
				url: 'https://note.com/cauchye_asia/n/nf25d5f3832bf'
			},
			{
				title: '【月$20 vs $2,000】GPT-6 Luna の登場で「安いモデル」の基準が変わった',
				url: 'https://note.com/cauchye_asia/n/nad0b7bce8581'
			}
		]
	},
	{
		id: 'zenn',
		label: 'Zenn',
		url: 'https://zenn.dev/cauchye_asia',
		posts: [
			{
				title:
					'Codexのconfig.toml 2行で長期タスク向けの文脈管理をON｜0.152以前はエラー、0.153.0から認識',
				url: 'https://zenn.dev/cauchye_asia/articles/3d7cb4decab538'
			},
			{
				title:
					'月1億トークンの試算で$20〜$2,000の100倍差｜モデル7構成の月額をPythonで比較して分かった節約の順番',
				url: 'https://zenn.dev/cauchye_asia/articles/e99a1a03fdcad5'
			}
		]
	}
] as const;

// Official accounts linked from the footer and the organization data. YouTube has no
// posts to feature yet, so it stays out of the article list block.
export const officialAccounts = [
	...officialMedia.map(({ id, label, url }) => ({ id, label, url })),
	{ id: 'qiita', label: 'Qiita', url: 'https://qiita.com/cauchye_asia' },
	{ id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@cauchye_asia' },
	{ id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/company/cauchye' }
] as const;

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

// Booking for the first meeting. Set `url` to an external scheduling tool to send every
// "free consultation" button there instead.
// `url` empty: the site's own booking page (/<locale>/book), which posts the preferred slots
// to the contact Slack channel.
export const booking = {
	url: ''
} as const;

// Where a "free consultation" button leads, for the given locale.
export function consultHref(locale: string): string {
	return booking.url || `/${locale}/book`;
}

// Cloudflare Web Analytics. Paste the site token from the dashboard (Web Analytics → the
// cauchye.com site → "Manage site" → JS snippet) to load the beacon; empty loads nothing.
export const analytics = {
	cloudflareBeaconToken: ''
} as const;
