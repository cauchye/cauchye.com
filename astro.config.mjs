import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
	site: 'https://www.cauchye.com',
	output: 'server',
	session: false,
	integrations: [svelte()],
	adapter: cloudflare({
		imageService: 'compile',
		configPath: './wrangler.astro.jsonc'
	}),
	vite: {
		plugins: [tailwindcss()]
	}
});
