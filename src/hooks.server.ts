import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import {
	baseLocale,
	extractLocaleFromUrl,
	getTextDirection,
	locales,
	cookieName as paraglideCookieName
} from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';

const LOCALE_RE = new RegExp(`^\\/(${locales.join('|')})(\\/|$)`);
const AVAILABLE_LOCALES: readonly string[] = locales;

/**
 * Every page URL carries its locale (`/ja/`), which is also what makes
 * `getLocale()` resolve on the server.
 *
 * Exempt: /api/* is called by fetch(), where a prefix would only add a
 * redirect hop.
 */
const handleLocaleUrl: Handle = ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		return resolve(event);
	}

	const { url } = event;
	if (LOCALE_RE.test(url.pathname)) return resolve(event);

	const cookieLocale = event.cookies.get(paraglideCookieName);
	let locale = cookieLocale || extractLocaleFromUrl(url.href) || baseLocale;
	if (!AVAILABLE_LOCALES.includes(locale)) locale = baseLocale;

	const newPath = `/${locale}${url.pathname === '/' ? '' : url.pathname}`;
	const target = new URL(newPath, url.origin);
	target.search = url.search;
	target.hash = url.hash;

	throw redirect(302, target.toString());
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

export const handle: Handle = sequence(handleLocaleUrl, handleParaglide);
