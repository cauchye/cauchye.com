import { type FullConfig, request } from '@playwright/test';

import { bootstrapToken } from '../playwright.config';

// Seeds the bundled content into the local EmDash database so every test reads the site
// from the CMS, the way production does once it has been bootstrapped.
export default async function globalSetup(config: FullConfig) {
	const context = await request.newContext({ baseURL: config.projects[0].use.baseURL });
	const response = await context.post('/_emdash/api/setup', {
		headers: { authorization: `Bearer ${bootstrapToken}` },
		data: { title: 'CAUCHYE ASIA PTE. LTD.', includeContent: true }
	});
	await context.dispose();

	// 409: a reused dev server was already bootstrapped.
	if (!response.ok() && response.status() !== 409) {
		throw new Error(`EmDash bootstrap failed with HTTP ${response.status()}`);
	}
}
