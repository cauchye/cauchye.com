import type { APIRoute } from 'astro';

import { localeFromRequest } from '../i18n';

export const GET: APIRoute = ({ request }) => {
	const locale = localeFromRequest(request);
	const { search } = new URL(request.url);
	return new Response(null, {
		status: 302,
		headers: {
			'Cache-Control': 'private, no-store',
			Location: `/${locale}${search}`,
			Vary: 'Accept-Language'
		}
	});
};
