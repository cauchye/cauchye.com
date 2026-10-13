import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import { d1, r2 } from '@emdash-cms/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import emdash from 'emdash/astro';

export default defineConfig({
	site: 'https://www.cauchye.com',
	output: 'server',
	adapter: cloudflare({ imageService: 'compile' }),
	// Declares the content locales for EmDash. Public routing stays with the explicit
	// `/[lang]/...` pages, so Astro's own locale routing is switched off.
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'ja'],
		routing: 'manual'
	},
	integrations: [
		// React renders the EmDash admin only; the public site stays Astro + Svelte.
		react(),
		svelte(),
		emdash({
			siteUrl: 'https://www.cauchye.com',
			database: d1({ binding: 'DB', session: 'auto' }),
			storage: r2({ binding: 'MEDIA' })
		})
	],
	vite: {
		plugins: [tailwindcss()]
	},
	devToolbar: { enabled: false }
});
