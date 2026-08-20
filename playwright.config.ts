import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.e2e.ts',
	use: { baseURL: 'http://127.0.0.1:4173' },
	webServer: {
		command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
		url: 'http://127.0.0.1:4173/en',
		reuseExistingServer: !process.env.CI
	}
});
