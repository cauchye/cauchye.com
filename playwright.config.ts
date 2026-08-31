import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.e2e.ts',
	use: { baseURL },
	webServer: {
		command: `pnpm run build && pnpm exec wrangler dev --ip 127.0.0.1 --port ${port}`,
		url: `${baseURL}/en`,
		reuseExistingServer: !process.env.CI
	}
});
