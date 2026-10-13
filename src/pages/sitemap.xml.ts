import type { APIRoute } from 'astro';

import { getSitemapArticles } from '../cms/content';
import { buildSitemap, sitemapPages } from '../cms/sitemap';
import { locales } from '../i18n';

export const prerender = false;

// Replaces EmDash's sitemap, which knows neither the static pages nor that every locale,
// including the default one, lives under `/<locale>`.
export const GET: APIRoute = async () => {
	const articles = (await Promise.all(locales.map(getSitemapArticles))).flat();
	return new Response(buildSitemap(sitemapPages(articles)), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
