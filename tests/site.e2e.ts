import { expect, test } from '@playwright/test';

import { SLACK_MESSAGE_CHUNK_LIMIT, splitSlackMessage } from '../src/contact';

test('redirects the root route to English', async ({ request }) => {
	const response = await request.get('/', { maxRedirects: 0 });
	expect(response.status()).toBe(302);
	expect(response.headers().location).toBe('/en');
});

for (const locale of ['en', 'ja']) {
	test(`renders the ${locale} site`, async ({ page }) => {
		await page.goto(`/${locale}`);
		await expect(page.locator('html')).toHaveAttribute('lang', locale);
		await expect(page.locator('main h1')).toBeVisible();
		await expect(page.locator('#contact form')).toBeVisible();
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`https://www.cauchye.com/${locale}`
		);
		await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
			'content',
			`https://www.cauchye.com/${locale}`
		);
	});
}

test('uses shadcn dropdown and sheet navigation', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/en');

	const languageTrigger = page.locator('[data-slot="dropdown-menu-trigger"]');
	await expect(languageTrigger).toHaveAccessibleName('Language');
	await languageTrigger.click();
	await expect(page.locator('[data-slot="dropdown-menu-content"]')).toBeVisible();
	await expect(page.getByRole('menuitem', { name: '日本語' })).toHaveAttribute('href', '/ja');
	await page.keyboard.press('Escape');
	await expect(page.locator('[data-slot="dropdown-menu-content"]')).toBeHidden();

	await page.setViewportSize({ width: 390, height: 844 });
	const sheetTrigger = page.locator('[data-slot="sheet-trigger"]');
	await expect(sheetTrigger).toHaveAccessibleName('Open menu');
	await sheetTrigger.click();
	await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
	await page.getByRole('link', { name: 'Services' }).last().click();
	await expect(page.locator('[data-slot="sheet-content"]')).toBeHidden();
});

test('shows localized server validation without native browser messages', async ({ page }) => {
	await page.goto('/ja');
	const form = page.locator('#contact form');
	await expect(form).toHaveAttribute('novalidate', '');
	await form.getByRole('button', { name: '送信する' }).click();
	await expect(page.locator('#name-error')).toHaveText('入力してください。');
	await expect(page.locator('#message-error')).toHaveText('10文字以上でご記入ください。');
	await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
});

test('returns locale-aware contact validation errors', async ({ request }) => {
	const response = await request.post('/api/contact?locale=ja', {
		headers: { origin: 'http://127.0.0.1:4173' },
		multipart: {
			locale: 'ja',
			name: '',
			company: '',
			email: '',
			message: ''
		}
	});
	expect(response.status()).toBe(400);
	const result = await response.json();
	expect(result.errors.name[0]).toBe('入力してください。');
	expect(result.errors.message[0]).toBe('10文字以上でご記入ください。');
});

test('silently accepts honeypot submissions', async ({ request }) => {
	const response = await request.post('/api/contact?locale=en', {
		headers: { origin: 'http://127.0.0.1:4173' },
		multipart: {
			locale: 'en',
			website: 'https://spam.invalid'
		}
	});
	expect(response.status()).toBe(200);
	await expect(response.json()).resolves.toEqual({ success: true });
});

test('splits escaped Slack messages within section and block limits', () => {
	const chunks = splitSlackMessage(`${'<>&🙂\n'.repeat(666)}<>`);

	expect(chunks.length).toBeGreaterThan(1);
	expect(chunks.length).toBeLessThanOrEqual(44);
	for (const chunk of chunks) {
		expect(chunk).toMatch(/^> /);
		expect(chunk.length).toBeLessThanOrEqual(SLACK_MESSAGE_CHUNK_LIMIT);
		expect(chunk).not.toMatch(/&(?:a(?:m(?:p)?)?|l(?:t)?|g(?:t)?)?$/);
	}
});
