import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

			// Nothing links to the articles: no navigation entry and no teaser section.
			for (const path of ['', '/business/it-ai', '/business/corporate-advisory']) {
				await page.goto(`/${locale}${path}`);
				await expect(page.locator(`a[href^="/${locale}/articles"]`)).toHaveCount(0);
				await expect(page.locator('[data-article-teasers]')).toHaveCount(0);
			}
			await page.setViewportSize({ width: 390, height: 844 });
			await page.locator('[data-slot="sheet-trigger"]').click();
			await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible();
			await expect(page.locator('[data-slot="sheet-content"] a[href*="/articles"]')).toHaveCount(0);
			await page.setViewportSize({ width: 1280, height: 720 });
		}
	});

	test('lists only the static pages in the sitemap', async ({ request }) => {
		const response = await request.get('/sitemap.xml');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain('application/xml');
		const xml = await response.text();
		expect(xml).toContain('<loc>https://www.cauchye.com/en</loc>');
		expect(xml).toContain('<loc>https://www.cauchye.com/ja/business/it-ai/agent-adoption</loc>');
		expect(xml).not.toContain('/articles');
		expect((await request.get('/sitemap-articles.xml')).status()).toBe(404);
	});

	test('serves valid feeds without items', async ({ request }) => {
		for (const path of ['/rss.xml', '/en/rss.xml', '/ja/rss.xml']) {
			const response = await request.get(path);
			expect(response.status(), path).toBe(200);
			expect(response.headers()['content-type'], path).toBe('application/rss+xml; charset=utf-8');
			const xml = await response.text();
			expect(xml, path).toContain('<rss version="2.0"');
			expect(xml, path).toContain(`<atom:link href="https://www.cauchye.com${path}"`);
			expect(xml, path).not.toContain('<item>');
		}
		expect((await request.get('/fr/rss.xml')).status()).toBe(404);
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

	test('keeps the site navigation in the header on every page', async ({ page }) => {
		const pages = [
			['ja', '/ja', ['事業内容', '会社概要', '記事']],
			['ja', '/ja/contact', ['事業内容', '会社概要', '記事']],
			['ja', '/ja/articles', ['事業内容', '会社概要', '記事']],
			['ja', '/ja/articles/sample-article', ['事業内容', '会社概要', '記事']],
			['en', '/en/articles', ['Services', 'Company', 'Articles']],
			['en', '/en/articles/sample-article', ['Services', 'Company', 'Articles']]
		] as const;
		for (const [locale, path, labels] of pages) {
			await page.setViewportSize({ width: 1280, height: 800 });
			await page.goto(path);
			const headerNav = page.locator('[data-site-header] nav').first();
			await expect(headerNav.locator('a')).toHaveText([...labels]);
			await expect(headerNav.locator('a').first()).toHaveAttribute('href', `/${locale}#services`);

			await page.setViewportSize({ width: 390, height: 800 });
			await page.locator('[data-site-header] [data-slot="sheet-trigger"]').click();
			const menu = page.locator('[data-slot="sheet-content"] nav');
			await expect(menu.locator('a')).toHaveText([...labels]);
			await page.keyboard.press('Escape');
		}
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
		await expect(page.locator('[data-site-header] nav').first().locator('a')).toHaveText([
			'事業内容',
			'会社概要',
			'記事'
		]);
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

	test('links the article list from the header and the footer', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		for (const [locale, label] of [
			['ja', '記事'],
			['en', 'Articles']
		]) {
			await page.goto(`/${locale}`);
			const link = page.locator('[data-site-header] nav').first().locator('a').last();
			await expect(link).toBeVisible();
			await expect(link).toHaveText(label);
			await expect(link).toHaveAttribute('href', `/${locale}/articles`);
		}

		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/ja/business/it-ai');
		await page.locator('[data-slot="sheet-trigger"]').click();
		const sheetLink = page.locator('[data-slot="sheet-content"] nav a').last();
		await expect(sheetLink).toHaveText('記事');
		await sheetLink.click();
		await expect(page).toHaveURL(/\/ja\/articles$/);
		await expect(
			page.locator('[data-site-header] nav').first().locator('a[aria-current="page"]')
		).toHaveText('記事');

		await page.goto('/ja');
		await expect(page.locator('footer nav a')).toHaveText([
			'事業内容',
			'会社概要',
			'IT・AIソリューション',
			'コーポレートアドバイザリー',
			'記事'
		]);
		await expect(page.locator('footer nav a').last()).toHaveAttribute('href', '/ja/articles');
	});

	test('shows the latest articles on the home page', async ({ page }) => {
		await page.goto('/ja');
		const section = page.locator('[data-article-teasers]');
		await expect(section.locator('h2')).toHaveText('最新記事');
		await expect(section.locator('[data-article-card]')).toHaveCount(3);
		await expect(section.locator('[data-article-card] h3')).toHaveCount(3);
		await expect(section.getByRole('link', { name: '記事一覧へ' })).toHaveAttribute(
			'href',
			'/ja/articles'
		);

		await page.goto('/en');
		const english = page.locator('[data-article-teasers]');
		await expect(english.locator('h2')).toHaveText('Latest articles');
		await expect(english.locator('[data-article-card]')).toHaveCount(2);
		await expect(english.getByRole('link', { name: 'View all articles' })).toHaveAttribute(
			'href',
			'/en/articles'
		);
	});

	test('shows related articles on every business page', async ({ page }) => {
		for (const path of [
			'/business/it-ai',
			'/business/it-ai/agent-adoption',
			'/business/it-ai/solution-development',
			'/business/corporate-advisory'
		]) {
			await page.goto(`/ja${path}`);
			const section = page.locator('[data-article-teasers]');
			await expect(section.locator('h2'), path).toHaveText('関連記事');
			await expect(section.locator('[data-article-card]'), path).toHaveCount(3);
		}
		await page.goto('/en/business/it-ai');
		const english = page.locator('[data-article-teasers]');
		await expect(english.locator('h2')).toHaveText('Related articles');
		await expect(english.locator('[data-article-card]')).toHaveCount(2);
	});

	test('offers other articles and the contact page below an article', async ({ page }) => {
		await page.goto('/ja/articles/sample-article');
		const others = page.locator('[data-article-teasers]');
		await expect(others.locator('h2')).toHaveText('他の記事');
		await expect(others.locator('[data-article-card]')).toHaveCount(2);
		await expect(
			others.locator('[data-article-card][href="/ja/articles/sample-article"]')
		).toHaveCount(0);
		const contact = page.locator('[data-article-contact]');
		await expect(contact.locator('h2')).toBeVisible();
		await expect(contact.getByRole('link', { name: 'お問い合わせ' })).toHaveAttribute(
			'href',
			'/ja/contact'
		);

		// The only other English article is the one on offer.
		await page.goto('/en/articles/sample-article');
		await expect(page.locator('[data-article-teasers] [data-article-card]')).toHaveAttribute(
			'href',
			'/en/articles/sample-english-slug'
		);
		await expect(
			page.locator('[data-article-contact]').getByRole('link', { name: 'Contact us' })
		).toHaveAttribute('href', '/en/contact');

		const missing = await page.goto('/ja/articles/unknown');
		expect(missing?.status()).toBe(404);
		await expect(page.locator('[data-article-teasers]')).toHaveCount(0);
		await expect(page.locator('[data-article-contact]')).toHaveCount(0);
	});

	test('describes an article for search engines and link previews', async ({ page }) => {
		await page.goto('/ja/articles/sample-article');
		const meta = (name: string) => page.locator(`meta[property="${name}"], meta[name="${name}"]`);
		await expect(meta('og:type')).toHaveAttribute('content', 'article');
		await expect(meta('og:image')).toHaveAttribute(
			'content',
			'https://www.cauchye.com/agents/grok-bot-coordination.png'
		);
		await expect(meta('og:image:alt')).toHaveAttribute('content', 'カバー画像のサンプル');
		await expect(meta('twitter:card')).toHaveAttribute('content', 'summary_large_image');
		await expect(meta('twitter:image')).toHaveAttribute(
			'content',
			'https://www.cauchye.com/agents/grok-bot-coordination.png'
		);
		await expect(meta('og:site_name')).toHaveAttribute('content', 'CAUCHYE ASIA PTE. LTD.');
		await expect(meta('og:locale')).toHaveAttribute('content', 'ja_JP');
		await expect(meta('og:url')).toHaveAttribute(
			'content',
			'https://www.cauchye.com/ja/articles/sample-article'
		);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://www.cauchye.com/ja/articles/sample-article'
		);
		const published = await meta('article:published_time').getAttribute('content');
		expect(published).toBe(await page.locator('main article header time').getAttribute('datetime'));
		expect(published).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);

		// An article without a cover image, and a page that is not an article.
		await page.goto('/ja/articles/sample-ja-only');
		await expect(meta('og:type')).toHaveAttribute('content', 'article');
		await expect(meta('og:image')).toHaveAttribute(
			'content',
			'https://www.cauchye.com/og-default.png'
		);
		await expect(meta('og:image:alt')).toHaveAttribute('content', 'CAUCHYE ASIA PTE. LTD.');
		await expect(meta('twitter:card')).toHaveAttribute('content', 'summary_large_image');
		await page.goto('/ja/articles');
		await expect(meta('og:type')).toHaveAttribute('content', 'website');
		await expect(meta('og:image')).toHaveAttribute(
			'content',
			'https://www.cauchye.com/og-default.png'
		);
		await expect(meta('article:published_time')).toHaveCount(0);
	});

	test('lists the articles in the feeds', async ({ page, request }) => {
		const items = async (path: string) => {
			const response = await request.get(path);
			expect(response.headers()['content-type'], path).toBe('application/rss+xml; charset=utf-8');
			return (await response.text()).split('<item>').slice(1);
		};

		const japanese = await items('/ja/rss.xml');
		expect(japanese).toHaveLength(3);
		const sample = japanese.find((item) => item.includes('/ja/articles/sample-article<'));
		expect(sample).toContain('<title>サンプル記事：記事レイアウトの確認</title>');
		expect(sample).toContain('<link>https://www.cauchye.com/ja/articles/sample-article</link>');
		expect(sample).toContain(
			'<guid isPermaLink="true">https://www.cauchye.com/ja/articles/sample-article</guid>'
		);
		expect(sample).toMatch(/<pubDate>\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT<\/pubDate>/);

		const english = await items('/en/rss.xml');
		expect(english).toHaveLength(2);
		expect(english.join()).not.toContain('sample-draft');
		expect(english.join()).not.toContain('/ja/articles/');
		expect(await items('/rss.xml')).toHaveLength(5);

		// Every page names the feed of its language.
		for (const [path, href] of [
			['/ja', 'https://www.cauchye.com/ja/rss.xml'],
			['/en/articles/sample-article', 'https://www.cauchye.com/en/rss.xml']
		]) {
			await page.goto(path);
			await expect(
				page.locator('link[rel="alternate"][type="application/rss+xml"]'),
				path
			).toHaveAttribute('href', href);
		}
	});

	test('lists the articles of both languages in the sitemap', async ({ request }) => {
		const xml = await (await request.get('/sitemap.xml')).text();
		const url = (loc: string) =>
			xml
				.split('<url>')
				.find((block) => block.includes(`<loc>https://www.cauchye.com${loc}</loc>`));

		for (const loc of ['/en/articles', '/ja/articles', '/en/articles/sample-article']) {
			expect(url(loc), loc).toBeDefined();
		}
		// Translations are paired even when their slugs differ.
		const translated = url('/ja/articles/sample-japanese-slug');
		expect(translated).toContain(
			'hreflang="en" href="https://www.cauchye.com/en/articles/sample-english-slug"'
		);
		expect(translated).toContain(
			'hreflang="ja" href="https://www.cauchye.com/ja/articles/sample-japanese-slug"'
		);
		expect(translated).toContain(
			'hreflang="x-default" href="https://www.cauchye.com/en/articles/sample-english-slug"'
		);
		expect(translated).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/);

		const japaneseOnly = url('/ja/articles/sample-ja-only');
		expect(japaneseOnly).toContain('hreflang="ja"');
		expect(japaneseOnly).not.toContain('hreflang="en"');
		expect(xml).not.toContain('sample-draft');
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
		// The English list is not a translation of the article, so it is not an alternate.
		await expect(page.locator('link[hreflang="en"]')).toHaveCount(0);
		await expect(page.locator('link[hreflang="ja"]')).toHaveCount(1);
		await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute(
			'href',
			'https://www.cauchye.com/ja/articles/sample-ja-only'
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
		for (const path of ['/ja', '/ja/articles', '/ja/articles/sample-article']) {
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

	test('puts the articles sharing a tag first below an article', async ({ page }) => {
		// Tags the fixtures the way `pnpm run articles:add --tags` tags published articles.
		const tags = join(mkdtempSync(join(tmpdir(), 'cauchye-e2e-tags-')), 'tags.json');
		writeFileSync(
			tags,
			JSON.stringify({
				'ja/sample-ja-only': ['AI Agents', 'Governance'],
				'en/sample-english-slug': ['Governance']
			})
		);
		execFileSync(
			'node',
			[
				'scripts/add-article.ts',
				'--local',
				'--persist-to',
				process.env.PLAYWRIGHT_STATE_DIR!,
				'--tags',
				tags
			],
			{ stdio: 'inherit' }
		);

		// The Japanese translation shares the tag of its English original.
		await page.goto('/ja/articles/sample-ja-only');
		const related = page.locator('[data-article-teasers]');
		await expect(related.locator('h2')).toHaveText('関連記事');
		const cards = related.locator('[data-article-card]');
		await expect(cards).toHaveCount(2);
		await expect(cards.first()).toHaveAttribute('href', '/ja/articles/sample-japanese-slug');

		// An article without tags still gets the newest ones.
		await page.goto('/ja/articles/sample-article');
		await expect(related.locator('h2')).toHaveText('他の記事');
		await expect(cards).toHaveCount(2);
	});
});

test.describe('official media', () => {
	const profiles = [
		'https://note.com/cauchye_asia',
		'https://zenn.dev/cauchye_asia',
		'https://qiita.com/cauchye_asia',
		'https://www.youtube.com/@cauchye_asia',
		'https://www.linkedin.com/company/cauchye'
	];

	test('links the official accounts from the footer and the organization data', async ({
		page
	}) => {
		for (const [locale, label] of [
			['ja', '公式メディア'],
			['en', 'Official media']
		]) {
			await page.goto(`/${locale}`);
			const group = page.locator('footer [data-official-accounts]');
			await expect(group.locator('h2')).toHaveText(label);
			const links = group.locator('a');
			await expect(links).toHaveText(['note', 'Zenn', 'Qiita', 'YouTube', 'LinkedIn']);
			for (const index of profiles.keys()) {
				await expect(links.nth(index)).toHaveAttribute('rel', 'noopener noreferrer');
			}
			for (const [index, url] of profiles.entries()) {
				await expect(links.nth(index)).toHaveAttribute('href', url);
				await expect(links.nth(index)).toHaveAttribute('target', '_blank');
				await expect(links.nth(index)).toHaveAttribute('rel', /noopener/);
			}
			const organization = JSON.parse(
				(await page.locator('script[type="application/ld+json"]').first().textContent()) ?? ''
			);
			expect(organization.sameAs).toEqual(profiles);
		}
	});

	test('shows the latest note and Zenn posts on the article list', async ({ page }) => {
		for (const [locale, title] of [
			['ja', '「note」と「Zenn」でも発信中'],
			['en', 'Also publishing on note and Zenn']
		]) {
			await page.goto(`/${locale}/articles`);
			const block = page.locator('[data-official-media]');
			await expect(block.locator('h2')).toContainText(title);
			// The posts are Japanese, which the English page says.
			await expect(block.getByText('Japanese', { exact: true })).toHaveCount(
				locale === 'en' ? 1 : 0
			);
			const posts = block.locator('li a');
			await expect(posts).toHaveCount(4);
			await expect(posts.first()).toHaveAttribute(
				'href',
				'https://note.com/cauchye_asia/n/nf25d5f3832bf'
			);
			await expect(posts.last()).toHaveAttribute(
				'href',
				'https://zenn.dev/cauchye_asia/articles/e99a1a03fdcad5'
			);
			for (const link of await block.locator('a').all()) {
				await expect(link).toHaveAttribute('target', '_blank');
				await expect(link).toHaveAttribute('rel', /noopener/);
			}
			for (const post of await posts.all()) await expect(post).toHaveAttribute('lang', 'ja');
		}
	});
});
