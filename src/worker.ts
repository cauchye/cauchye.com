import handler, { PluginBridge, createScheduledHandler } from '@emdash-cms/cloudflare/worker';

import { isAuthorizedEmDashBootstrap, isEmDashOwnerRoute } from './lib/server/emdash-bootstrap';

export { PluginBridge };

const astroFetch = handler.fetch;
if (!astroFetch) {
	throw new Error('EmDash Cloudflare handler is missing its fetch entrypoint');
}

type AstroRequest = Parameters<typeof astroFetch>[0];

const SETUP_PATH = '/_emdash/admin/setup';

function redirectsToSetup(response: Response, requestUrl: URL): boolean {
	const location = response.headers.get('Location');
	if (response.status < 300 || response.status >= 400 || !location) return false;
	return new URL(location, requestUrl).pathname === SETUP_PATH;
}

export default {
	...handler,
	async fetch(
		request: AstroRequest,
		env: Cloudflare.Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);
		const ownerRoute = isEmDashOwnerRoute(url.pathname);

		// The site has no public sign-in. EmDash's own staff routes — including the first-admin
		// setup of a fresh database — stay closed until an operator opts in.
		if (
			ownerRoute &&
			String(env.EMDASH_ADMIN_ENABLED) !== 'true' &&
			!(await isAuthorizedEmDashBootstrap(request, env))
		) {
			return new Response('EmDash administration is not enabled', {
				status: 503,
				headers: {
					'Cache-Control': 'no-store',
					'Content-Type': 'text/plain; charset=utf-8',
					'Retry-After': '3600'
				}
			});
		}

		const readOnly = request.method === 'GET' || request.method === 'HEAD';
		const retry = readOnly && !ownerRoute ? (request.clone() as AstroRequest) : undefined;
		const response = await astroFetch(request, env, ctx);

		// On a database without EmDash tables, EmDash sends public visitors to the (closed)
		// setup wizard. Its sitemap route initialises the runtime without authentication —
		// schema migrations plus the bundled seed, never an admin account — so run that once
		// and serve the page the visitor asked for.
		if (retry && redirectsToSetup(response, url)) {
			await astroFetch(new Request(new URL('/sitemap.xml', url)) as AstroRequest, env, ctx);
			return astroFetch(retry, env, ctx);
		}

		return response;
	},
	scheduled: createScheduledHandler()
} satisfies ExportedHandler<Cloudflare.Env>;
