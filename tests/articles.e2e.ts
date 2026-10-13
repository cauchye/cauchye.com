import { expect, test } from '@playwright/test';

import { seedArticleFixtures } from '../scripts/seed-article-fixtures';

// The fixtures are added part-way through, so the tests run in file order.
test.describe.configure({ mode: 'serial' });

test.describe('before any article is published', () => {
	test('shows an empty article list and keeps it out of the navigation', async ({ page }) => {
		for (const [locale, heading, empty] of [
			['en', 'Articles', 'No articles have been published yet.'],
			['ja', '記事', '公開中の記事はまだありません。']
		]) {
			await page.goto(`/${locale}/articles`);
			await expect(page.locator('html')).toHaveAttribute('lang', locale);
			await expect(page.locator('main h1')).toHaveText(heading);
			await expect(page.locator('[data-articles-empty]')).toHaveText(empty);
			await expect(page.locator('[data-article-card]')).toHaveCount(0);
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
				'href',
				`https://www.cauchye.com/${locale}/articles`
			);

			await page.goto(`/${locale}`);
			await expect(page.locator(`a[href="/${locale}/articles"]`)).toHaveCount(0);
		}
	});

	test('answers 404 for an unknown article', async ({ page }) => {
		const response = await page.goto('/ja/articles/sample-article');
		expect(response?.status()).toBe(404);
		await expect(page.locator('[data-article-not-found] h1')).toHaveText('記事が見つかりません');
	});
});

test.describe('with published articles', () => {
	test.beforeAll(() => {
		const stateDir = process.env.PLAYWRIGHT_STATE_DIR;
		if (!stateDir) throw new Error('PLAYWRIGHT_STATE_DIR is not set.');
		seedArticleFixtures(stateDir);
	});

	test('lists published articles in the requested language', async ({ page }) => {
		await page.goto('/ja/articles');
		const cards = page.locator('[data-article-card]');
		// Both fixtures are published in the same instant, so their order is not asserted.
		await expect(cards.filter({ hasText: 'サンプル記事：記事レイアウトの確認' })).toHaveCount(1);
		await expect(cards.filter({ hasText: 'サンプル記事：日本語のみで公開' })).toHaveCount(1);
		await expect(cards).toHaveCount(3);
		await expect(page.locator('[data-articles-empty]')).toHaveCount(0);
		const card = page.locator('[data-article-card][href="/ja/articles/sample-article"]');
		await expect(card.locator('img')).toHaveAttribute('src', '/agents/grok-bot-coordination.png');
		await expect(card.locator('time')).toHaveText(/^\d{4}年\d{1,2}月\d{1,2}日$/);
		await expect(card).toContainText('記事を読む');

		await page.goto('/en/articles');
		const englishCards = page.locator('[data-article-card]');
		await expect(englishCards).toHaveCount(2);
		await expect(
			englishCards.filter({ hasText: 'Sample article: checking the article layout' })
		).toHaveCount(1);
		await expect(page.getByText('Sample draft: never public')).toHaveCount(0);
	});

	test('renders an article with the site header, footer, and typography', async ({ page }) => {
		await page.goto('/ja/articles');
		await page.locator('[data-article-card][href="/ja/articles/sample-article"]').click();
		await expect(page).toHaveURL(/\/ja\/articles\/sample-article$/);
		await expect(page).toHaveTitle('サンプル記事：記事レイアウトの確認 | CAUCHYE');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://www.cauchye.com/ja/articles/sample-article'
		);
		await expect(page.locator('[data-site-header]')).toBeVisible();
		await expect(page.locator('[data-site-header] nav').first().locator('a')).toHaveCount(0);
		await expect(page.locator('footer')).toContainText('CAUCHYE ASIA PTE. LTD.');

		const article = page.locator('main article');
		await expect(article.locator('h1')).toHaveText('サンプル記事：記事レイアウトの確認');
		await expect(article.locator('header time')).toBeVisible();
		await expect(article.locator('figure img').first()).toHaveAttribute(
			'src',
			'/agents/grok-bot-coordination.png'
		);
		const body = article.locator('.article-body');
		await expect(body.locator('h2')).toHaveText('見出しと本文');
		await expect(body.locator('ul li')).toHaveCount(3);
		await expect(body.locator('ul')).toHaveCSS('list-style-type', 'disc');
		await expect(body.locator('blockquote')).toHaveText('引用の表示例です。');
		await expect(body.getByRole('link', { name: 'トップページへ戻る' })).toHaveAttribute(
			'href',
			'/ja'
		);
		await expect(body.locator('figure img')).toHaveAttribute('src', '/agents/codex-interface.webp');
		await expect(body.locator('figcaption')).toHaveText([
			'本文中の画像とキャプションの表示例',
			'動画キャプションの表示例'
		]);
		// Code keeps its line breaks and the page's light styling; a long line scrolls inside it.
		const code = body.locator('pre');
		await expect(code.locator('code')).toHaveText(/^\[sample\]\nenabled = true\nlong_value = /);
		await expect(code).toHaveCSS('overflow-x', 'auto');
		const [codeColor, bodyColor] = await Promise.all([
			code.locator('code').evaluate((element) => getComputedStyle(element).color),
			body.evaluate((element) => getComputedStyle(element).color)
		]);
		expect(codeColor).toBe(bodyColor);
		await expect(body.locator('iframe')).toHaveAttribute(
			'src',
			'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0&start=30'
		);
		await expect(body.locator('iframe')).toHaveAttribute('title', 'Sample video');

		// The article uses the same typeface and colours as the existing pages.
		const articleFont = await article
			.locator('h1')
			.evaluate((h1) => getComputedStyle(h1).fontFamily);
		await page.goto('/ja');
		const homeFont = await page
			.locator('main h1')
			.evaluate((h1) => getComputedStyle(h1).fontFamily);
		expect(articleFont).toBe(homeFont);
	});

	test('links the article list from the footer only', async ({ page }) => {
		await page.goto('/ja');
		await expect(page.locator('footer nav a')).toHaveText([
			'事業内容',
			'会社概要',
			'IT・AIソリューション',
			'コーポレートアドバイザリー',
			'記事'
		]);
		await expect(page.locator('footer nav a').last()).toHaveAttribute('href', '/ja/articles');
		await expect(page.locator('[data-site-header] a[href*="/articles"]')).toHaveCount(0);
	});

	test('switches language to the translation, or to the list when there is none', async ({
		page
	}) => {
		await page.goto('/ja/articles/sample-article');
		await page.locator('[data-slot="dropdown-menu-trigger"]').click();
		await expect(page.getByRole('menuitem', { name: 'English' })).toHaveAttribute(
			'href',
			'/en/articles/sample-article'
		);
		await expect(page.locator('link[hreflang="en"]')).toHaveAttribute(
			'href',
			'https://www.cauchye.com/en/articles/sample-article'
		);

		// A translation is found by its translation group, not by sharing the slug.
		await page.goto('/ja/articles/sample-japanese-slug');
		await page.locator('[data-slot="dropdown-menu-trigger"]').click();
		await expect(page.getByRole('menuitem', { name: 'English' })).toHaveAttribute(
			'href',
			'/en/articles/sample-english-slug'
		);
		await page.goto('/en/articles/sample-english-slug');
		await expect(page.locator('link[hreflang="ja"]')).toHaveAttribute(
			'href',
			'https://www.cauchye.com/ja/articles/sample-japanese-slug'
		);

		await page.goto('/ja/articles/sample-ja-only');
		await expect(page.locator('main article h1')).toHaveText('サンプル記事：日本語のみで公開');
		await page.locator('[data-slot="dropdown-menu-trigger"]').click();
		await expect(page.getByRole('menuitem', { name: 'English' })).toHaveAttribute(
			'href',
			'/en/articles'
		);
	});

	test('keeps drafts, missing translations, and unknown slugs private', async ({ request }) => {
		for (const path of [
			'/en/articles/sample-draft',
			'/en/articles/sample-ja-only',
			'/en/articles/sample-japanese-slug',
			'/ja/articles/unknown'
		]) {
			const response = await request.get(path);
			expect(response.status(), path).toBe(404);
			expect(await response.text()).not.toContain('Draft body.');
		}
		const pastTheEnd = await request.get('/ja/articles?page=9', { maxRedirects: 0 });
		expect(pastTheEnd.status()).toBe(302);
		expect(pastTheEnd.headers().location).toBe('/ja/articles');
	});

	test('keeps the article pages inside the mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		for (const path of ['/ja/articles', '/ja/articles/sample-article']) {
			await page.goto(path);
			const hasHorizontalOverflow = await page.evaluate(
				() => document.documentElement.scrollWidth > window.innerWidth
			);
			expect(hasHorizontalOverflow, path).toBe(false);
			// Images and embeds stay within the page width.
			const widest = await page.evaluate(() =>
				Math.max(
					0,
					...[...document.querySelectorAll('main img, main iframe')].map(
						(element) => element.getBoundingClientRect().right
					)
				)
			);
			expect(widest, path).toBeLessThanOrEqual(390);
		}
	});
});
