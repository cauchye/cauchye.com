import { describe, expect, it } from 'vitest';

import { localeFromRequest } from '../../src/i18n';
import { GET } from '../../src/pages/index';

const call = (url: string, acceptLanguage?: string) =>
	(GET as unknown as (ctx: { request: Request }) => Response)({
		request: new Request(url, acceptLanguage ? { headers: { 'accept-language': acceptLanguage } } : undefined)
	});

describe('root redirect', () => {
	it('keeps the query string and defaults to ja without Accept-Language', () => {
		const res = call('https://www.cauchye.com/?utm_source=test&utm_medium=social');
		expect(res.status).toBe(302);
		expect(res.headers.get('location')).toBe('/ja?utm_source=test&utm_medium=social');
	});

	it('sends English browsers to /en with the query', () => {
		const res = call('https://www.cauchye.com/?utm_source=test', 'en-US,en;q=0.9');
		expect(res.headers.get('location')).toBe('/en?utm_source=test');
	});

	it('uses en for other languages and ja when nothing is usable', () => {
		expect(localeFromRequest(new Request('https://x/', { headers: { 'accept-language': 'fr-FR' } }))).toBe('en');
		expect(localeFromRequest(new Request('https://x/', { headers: { 'accept-language': 'ja,en;q=0.8' } }))).toBe('ja');
		expect(localeFromRequest(new Request('https://x/', { headers: { 'accept-language': '*' } }))).toBe('ja');
	});
});
