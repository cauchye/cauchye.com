interface EmDashBootstrapEnv {
	EMDASH_BOOTSTRAP_TOKEN?: string;
}

function matchesRoute(pathname: string, route: string): boolean {
	return pathname === route || pathname.startsWith(`${route}/`);
}

// Everything a person could use to sign in to, or take ownership of, EmDash: the admin UI,
// first-admin setup, and the session, OAuth, and MCP endpoints behind them. Content
// delivery under `/_emdash/` (media files, search) is deliberately not listed.
const OWNER_ROUTES = [
	'/_emdash/admin',
	'/_emdash/api/setup',
	'/_emdash/api/auth',
	'/_emdash/api/oauth',
	'/_emdash/api/mcp',
	'/_emdash/oauth',
	'/_emdash/.well-known/auth'
];

export function isEmDashOwnerRoute(pathname: string): boolean {
	return OWNER_ROUTES.some((route) => matchesRoute(pathname, route));
}

async function digest(value: string): Promise<Uint8Array<ArrayBuffer>> {
	const bytes = new TextEncoder().encode(value);
	const hash = await crypto.subtle.digest('SHA-256', bytes);
	return new Uint8Array(hash);
}

async function tokensMatch(left: string, right: string): Promise<boolean> {
	const [leftHash, rightHash] = await Promise.all([digest(left), digest(right)]);
	let difference = 0;
	for (let index = 0; index < leftHash.length; index += 1) {
		difference |= leftHash[index] ^ rightHash[index];
	}
	return difference === 0;
}

export async function isAuthorizedEmDashBootstrap(
	request: Request,
	env: EmDashBootstrapEnv
): Promise<boolean> {
	const url = new URL(request.url);
	if (
		request.method !== 'POST' ||
		url.pathname !== '/_emdash/api/setup' ||
		!env.EMDASH_BOOTSTRAP_TOKEN
	) {
		return false;
	}

	const authorization = request.headers.get('Authorization');
	if (!authorization?.startsWith('Bearer ')) return false;
	const suppliedToken = authorization.slice('Bearer '.length);
	if (!suppliedToken) return false;

	return tokensMatch(suppliedToken, env.EMDASH_BOOTSTRAP_TOKEN);
}
