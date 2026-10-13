import { describe, expect, it } from 'vitest';
import {
	isAuthorizedEmDashBootstrap,
	isEmDashOwnerRoute
} from '../../src/lib/server/emdash-bootstrap';

const token = 'bootstrap-token-with-sufficient-entropy-for-tests';

describe('EmDash production bootstrap gate', () => {
	it('gates sign-in and setup routes, not public EmDash services', () => {
		expect(isEmDashOwnerRoute('/_emdash/admin')).toBe(true);
		expect(isEmDashOwnerRoute('/_emdash/admin/content/pages')).toBe(true);
		expect(isEmDashOwnerRoute('/_emdash/api/setup/admin')).toBe(true);
		expect(isEmDashOwnerRoute('/_emdash/api/auth/passkey/options')).toBe(true);
		expect(isEmDashOwnerRoute('/_emdash/api/auth/magic-link/send')).toBe(true);
		expect(isEmDashOwnerRoute('/_emdash/api/oauth/token')).toBe(true);
		expect(isEmDashOwnerRoute('/_emdash/oauth/authorize')).toBe(true);
		expect(isEmDashOwnerRoute('/_emdash/api/mcp')).toBe(true);
		expect(isEmDashOwnerRoute('/_emdash/api/media/file/example')).toBe(false);
		expect(isEmDashOwnerRoute('/_emdash/api/search')).toBe(false);
		expect(isEmDashOwnerRoute('/_emdash/administrator')).toBe(false);
	});

	it('accepts only the exact setup POST with the configured bearer token', async () => {
		const request = new Request('https://www.cauchye.com/_emdash/api/setup', {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` }
		});
		await expect(
			isAuthorizedEmDashBootstrap(request, {
				EMDASH_BOOTSTRAP_TOKEN: token
			})
		).resolves.toBe(true);
	});

	it('rejects wrong tokens, wrong methods, and adjacent EmDash routes', async () => {
		for (const request of [
			new Request('https://www.cauchye.com/_emdash/api/setup', {
				method: 'POST',
				headers: { Authorization: 'Bearer wrong' }
			}),
			new Request('https://www.cauchye.com/_emdash/api/setup', {
				method: 'GET',
				headers: { Authorization: `Bearer ${token}` }
			}),
			new Request('https://www.cauchye.com/_emdash/api/setup/admin', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` }
			})
		]) {
			await expect(
				isAuthorizedEmDashBootstrap(request, {
					EMDASH_BOOTSTRAP_TOKEN: token
				})
			).resolves.toBe(false);
		}
	});
});
