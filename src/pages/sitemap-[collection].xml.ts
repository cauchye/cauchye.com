import type { APIRoute } from 'astro';

export const prerender = false;

// EmDash's per-collection sitemaps would list `/articles/<slug>` without the locale prefix
// this site routes by. `/sitemap.xml` is the only sitemap.
export const GET: APIRoute = () => new Response(null, { status: 404 });
