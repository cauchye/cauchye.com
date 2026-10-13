import type { APIRoute } from 'astro';

import { getTaggedArticles } from '../cms/content';
import { FEED_ARTICLE_COUNT, buildRssFeed, feedArticles, feedPath } from '../cms/rss';
import { getDictionary, locales } from '../i18n';
import { site } from '../site';

export const prerender = false;

// The articles of every language in one feed; `/<locale>/rss.xml` has one language each.
// A CMS without articles (or a failed lookup) yields a valid feed without items.
export const GET: APIRoute = async () => {
	const lists = await Promise.all(
		locales.map(async (locale) => [locale, await getTaggedArticles(locale, FEED_ARTICLE_COUNT)])
	);
	const m = getDictionary('en');
	const feed = buildRssFeed(
		{
			title: `${site.shortName} — ${m.articles_title}`,
			description: m.articles_meta_description,
			path: '/en/articles',
			feedPath: feedPath()
		},
		feedArticles(Object.fromEntries(lists))
	);
	return new Response(feed, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
