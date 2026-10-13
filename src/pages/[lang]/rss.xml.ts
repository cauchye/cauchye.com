import type { APIRoute } from 'astro';

import { getTaggedArticles } from '../../cms/content';
import { FEED_ARTICLE_COUNT, buildRssFeed, feedArticles, feedPath } from '../../cms/rss';
import { getDictionary, isLocale } from '../../i18n';
import { site } from '../../site';

export const prerender = false;

// The articles of one language. A CMS without articles yields a valid feed without items.
export const GET: APIRoute = async ({ params }) => {
	const locale = params.lang;
	if (!isLocale(locale)) return new Response(null, { status: 404 });

	const m = getDictionary(locale);
	const feed = buildRssFeed(
		{
			title: `${site.shortName} — ${m.articles_title}`,
			description: m.articles_meta_description,
			path: `/${locale}/articles`,
			feedPath: feedPath(locale),
			language: locale
		},
		feedArticles({ [locale]: await getTaggedArticles(locale, FEED_ARTICLE_COUNT) })
	);
	return new Response(feed, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
