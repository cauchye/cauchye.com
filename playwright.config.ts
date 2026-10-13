import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

// Each run gets an empty local D1/R2/KV so the suite always exercises a fresh EmDash
// install: schema bootstrap on the first request, then the seeded content.
const stateDir = (process.env.PLAYWRIGHT_STATE_DIR ??= mkdtempSync(join(tmpdir(), 'cauchye-e2e-')));
export const bootstrapToken = 'e2e-only-emdash-bootstrap-token';

export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.e2e.ts',
	globalSetup: './tests/global-setup.ts',
	use: { baseURL },
	webServer: {
		command: `pnpm run build && pnpm exec wrangler dev --ip 127.0.0.1 --port ${port} --persist-to ${stateDir} --var EMDASH_BOOTSTRAP_TOKEN:${bootstrapToken}`,
		url: `${baseURL}/en`,
		reuseExistingServer: !process.env.CI
	}
});
