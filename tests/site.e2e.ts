import { expect, test } from '@playwright/test';

import { SLACK_MESSAGE_CHUNK_LIMIT, splitSlackMessage } from '../src/contact';

test('redirects the root route using the browser language preference', async ({ request }) => {
	const japaneseResponse = await request.get('/', {
		headers: { 'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8' },
		maxRedirects: 0
	});
	expect(japaneseResponse.status()).toBe(302);
	expect(japaneseResponse.headers().location).toBe('/ja');
	expect(japaneseResponse.headers().vary).toBe('Accept-Language');
	expect(japaneseResponse.headers()['cache-control']).toBe('private, no-store');

	const englishResponse = await request.get('/', {
		headers: { 'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8' },
		maxRedirects: 0
	});
	expect(englishResponse.status()).toBe(302);
	expect(englishResponse.headers().location).toBe('/en');

	const defaultResponse = await request.get('/', { maxRedirects: 0 });
	expect(defaultResponse.status()).toBe(302);
	expect(defaultResponse.headers().location).toBe('/en');
});

for (const locale of ['en', 'ja']) {
	test(`renders the ${locale} site`, async ({ page }) => {
		await page.goto(`/${locale}`);
		await expect(page.locator('html')).toHaveAttribute('lang', locale);
		await expect(page.locator('main h1')).toBeVisible();
		await expect(page.locator('#contact')).toHaveCount(0);
		await expect(page.locator('[data-site-header] a').last()).toHaveAttribute(
			'href',
			`/${locale}/contact`
		);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`https://www.cauchye.com/${locale}`
		);
		await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
			'content',
			`https://www.cauchye.com/${locale}`
		);
	});

	test(`renders the ${locale} contact page`, async ({ page }) => {
		await page.goto(`/${locale}/contact`);
		await expect(page.locator('html')).toHaveAttribute('lang', locale);
		await expect(page.locator('#contact h1')).toBeVisible();
		await expect(page.locator('#contact form')).toBeVisible();
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`https://www.cauchye.com/${locale}/contact`
		);
	});

	for (const route of [
		'business/it-ai',
		'business/it-ai/agent-adoption',
		'business/it-ai/solution-development',
		'business/corporate-advisory'
	]) {
		test(`renders the ${locale} ${route} page`, async ({ page }) => {
			await page.goto(`/${locale}/${route}`);
			await expect(page.locator('html')).toHaveAttribute('lang', locale);
			await expect(page.locator('main h1')).toBeVisible();
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
				'href',
				`https://www.cauchye.com/${locale}/${route}`
			);
		});
	}
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

test('preserves the business page when changing language', async ({ page }) => {
	for (const path of [
		'/business/it-ai',
		'/business/it-ai/agent-adoption',
		'/business/it-ai/solution-development'
	]) {
		await page.goto(`/en${path}`);
		await page.locator('[data-slot="dropdown-menu-trigger"]').click();
		await expect(page.getByRole('menuitem', { name: '日本語' })).toHaveAttribute(
			'href',
			`/ja${path}`
		);
	}
});

test('uses only page-local links in the header navigation', async ({ page }) => {
	await page.goto('/ja');
	let headerNav = page.locator('[data-site-header] nav').first();
	await expect(headerNav.locator('a')).toHaveCount(2);
	await expect(headerNav.locator('a[href*="/business/"]')).toHaveCount(0);
	await expect(headerNav.locator('a').first()).toHaveAttribute('href', '/ja#services');
	await expect(headerNav.locator('a').last()).toHaveAttribute('href', '/ja#company');

	await page.goto('/ja/business/it-ai');
	headerNav = page.locator('[data-site-header] nav').first();
	await expect(headerNav.locator('a')).toHaveCount(2);
	await expect(headerNav.locator('a')).toHaveText(['パートナー', '事業内容']);
	await expect(headerNav.locator('a[href="/ja/business/corporate-advisory"]')).toHaveCount(0);

	await page.goto('/ja/business/it-ai/agent-adoption');
	headerNav = page.locator('[data-site-header] nav').first();
	await expect(headerNav.locator('a')).toHaveText([
		'AI組織図',
		'対応エージェント',
		'支援内容',
		'よくある質問'
	]);

	await page.goto('/ja/business/it-ai/solution-development');
	headerNav = page.locator('[data-site-header] nav').first();
	await expect(headerNav.locator('a')).toHaveText([
		'支援内容',
		'弊社の強み',
		'支援対象',
		'よくある質問'
	]);
});

test('shows semantic breadcrumbs on business pages', async ({ page }) => {
	await page.goto('/ja/business/corporate-advisory');
	const breadcrumb = page.getByRole('navigation', { name: 'パンくずリスト' });
	await expect(breadcrumb.getByRole('link', { name: 'トップ' })).toHaveAttribute('href', '/ja');
	await expect(breadcrumb.getByRole('link', { name: '事業内容' })).toHaveAttribute(
		'href',
		'/ja/#services'
	);
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
		'コーポレートアドバイザリー事業'
	);
});

test('shows Theseus Consulting through the shared advisory partner showcase', async ({ page }) => {
	await page.goto('/ja/business/corporate-advisory');
	const partners = page.locator('#partners');
	await expect(
		partners.getByRole('heading', { name: '共に企業価値を支えるパートナー。' })
	).toBeVisible();
	await expect(
		partners.locator(
			'a[href="https://theseus-grp.com/"] img[src="/partners/theseus-consulting.png"][alt="テセウスコンサルティング株式会社"]'
		)
	).toBeVisible();
	await expect(partners.locator('[data-partner-list]')).toHaveCount(1);
	await expect(page.locator('[data-section-heading-body]')).toHaveCount(0);
	await expect(
		page.getByText('第三者として集めた投資家の声と、企業の戦略・財務を同じテーブルで捉えます。')
	).toHaveCount(0);
});

test('presents the revised Japanese business structure and company identity', async ({ page }) => {
	await page.goto('/ja');
	await expect(page.locator('[data-site-header] img[src="/favicon.svg"]')).toBeVisible();
	await expect(page.locator('#services').getByRole('heading', { name: '事業内容' })).toBeVisible();
	await expect(
		page.getByRole('heading', { name: '技術と資本、二つの専門領域で企業変革を支える。' })
	).toHaveCount(0);
	await expect(page.locator('[data-section-heading-body]')).toHaveCount(0);
	await expect(page.getByText('コーシー・アジア・プライベート・リミテッド')).toBeVisible();
	await expect(page.getByText(/BUSINESS 0[1-9]/)).toHaveCount(0);
	const company = page.locator('#company');
	await expect(company.locator('h3')).toHaveText(['社名について', '経営陣', '会社情報']);
	await expect(company.getByText('About', { exact: true })).toHaveCount(0);
	await expect(
		company.locator('#about').getByRole('heading', { name: '社名について' })
	).toBeVisible();
	const aboutHeadingBox = await company.locator('#about h3').boundingBox();
	const aboutBodyBox = await company.locator('#about p').first().boundingBox();
	expect(aboutHeadingBox).not.toBeNull();
	expect(aboutBodyBox).not.toBeNull();
	expect(aboutBodyBox?.y ?? 0).toBeGreaterThan(
		(aboutHeadingBox?.y ?? 0) + (aboutHeadingBox?.height ?? 0)
	);
	await expect(
		company.locator('#leadership').getByRole('heading', { name: '経営陣' })
	).toBeVisible();
	await expect(company.locator('[data-representative-card]')).toBeVisible();
	await expect(company.locator('[data-representative-photo-placeholder]')).toBeVisible();
	await expect(company.locator('[data-representative-card]')).toContainText('代表取締役');
	await expect(company.locator('#leadership').getByText('代表', { exact: true })).toHaveCount(0);
	await expect(page.locator('main > #about, main > #leadership')).toHaveCount(0);

	const footerLinks = page.locator('footer nav a');
	await expect(
		page.locator('footer').getByText('IT・AIソリューションとコーポレートアドバイザリー。')
	).toHaveCount(0);
	await expect(footerLinks).toHaveText([
		'事業内容',
		'会社概要',
		'IT・AIソリューション',
		'コーポレートアドバイザリー'
	]);
});

test('presents three clear entry points on the IT and AI overview', async ({ page }) => {
	await page.goto('/ja/business/it-ai');
	await expect(
		page.getByRole('heading', {
			name: /AIを、組織の力に。\s+導入から開発まで伴走する。/
		})
	).toBeVisible();
	expect(
		await page.locator('main section[id]').evaluateAll((sections) => sections.map(({ id }) => id))
	).toEqual(['partners', 'capabilities']);

	const offerings = page.locator('#capabilities');
	await expect(offerings.locator('[data-slot="card"]')).toHaveCount(3);
	await expect(offerings.locator('[data-slot="card-title"] h3')).toHaveText([
		'AIエージェント導入支援',
		'AIソリューション開発',
		'd6e AI Gateway'
	]);
	await expect(offerings.getByRole('link', { name: '導入支援を見る' })).toHaveAttribute(
		'href',
		'/ja/business/it-ai/agent-adoption'
	);
	await expect(offerings.getByRole('link', { name: '開発支援を見る' })).toHaveAttribute(
		'href',
		'/ja/business/it-ai/solution-development'
	);
	const gatewayLink = offerings.getByRole('link', { name: 'd6e AI Gatewayを見る' });
	await expect(gatewayLink).toHaveAttribute('href', 'https://gateway.d6e.ai');
	await expect(gatewayLink).toHaveAttribute('target', '_blank');
	await expect(gatewayLink.locator('svg.lucide-external-link')).toBeVisible();
	for (const benefit of [
		'対象処理のAI利用料を最大50%削減',
		'利用実績から顧客向け請求書を作成し、入金まで管理',
		'発行済みの請求を、支払期日前に現金化'
	]) {
		await expect(offerings.getByText(benefit, { exact: true })).toBeVisible();
	}
	await expect(page.locator('#product, #strengths, #clients')).toHaveCount(0);
	await expect(page.getByText('RAG', { exact: true })).toHaveCount(0);
	for (const genericPoint of [
		'複数のAIプロバイダーを一つのAPIで利用',
		'ワークロード・顧客別に利用量を集計',
		'BYOKとマネージドキーに対応'
	]) {
		await expect(page.getByText(genericPoint, { exact: true })).toHaveCount(0);
	}

	const partnerList = page.locator('#partners ul:not([aria-hidden="true"])');
	const partnerNames = [
		'京都大学ソーシャルイノベーションセンター',
		'株式会社PoliPoli',
		'柳澤国際税務会計事務所',
		'STIR — Ethersecurity Pacific Holdings Pte. Ltd.',
		'TECHFUND',
		'JP-FORCE',
		'南青山アドバイザリーグループ',
		'テセウスコンサルティング株式会社',
		'株式会社Runner UP Plus',
		'EsTRUTH',
		'Morus'
	];
	for (const partner of partnerNames) {
		await expect(partnerList.locator(`img[alt="${partner}"]`)).toBeAttached();
		await expect(partnerList.getByText(partner, { exact: true })).toHaveCount(0);
	}
	expect(
		await partnerList.locator('img').evaluateAll((images) => images.map((image) => image.alt))
	).toEqual(partnerNames);
	await expect(partnerList.locator('img')).toHaveCount(11);
});

test('explains organization-wide AI agent adoption on its dedicated page', async ({ page }) => {
	await page.goto('/ja/business/it-ai/agent-adoption');
	await expect(
		page.getByRole('heading', { name: /AIエージェントを、\s+日々の業務の中へ。/ })
	).toBeVisible();
	await expect(page.getByText(/組織をAIエージェント化し/)).toBeVisible();
	expect(
		await page.locator('main section[id]').evaluateAll((sections) => sections.map(({ id }) => id))
	).toEqual(['organization', 'agents', 'capabilities', 'faq']);
	await expect(page.locator('#organization [data-org-scenario]')).toHaveCount(2);
	await expect(page.locator('#organization [data-org-node]')).toHaveCount(9);
	await expect(page.locator('[data-org-scenario="development"] [data-org-node]')).toContainText([
		'あなた',
		'Codex',
		'Claude Code',
		'Claude Code',
		'Claude Code'
	]);
	await expect(page.locator('[data-org-scenario="operations"] [data-org-node]')).toContainText([
		'あなた',
		'参謀Bot',
		'秘書Bot',
		'リサーチBot'
	]);
	await expect(
		page.locator('[data-org-scenario="operations"] img[src="/agents/grok-bot-mark.svg"]')
	).toHaveCount(3);
	await expect(page.locator('#capabilities [data-slot="card"]')).toHaveCount(4);
	await expect(
		page.locator('#capabilities').getByRole('heading', { name: 'AIネイティブ組織開発支援' })
	).toBeVisible();
	await expect(
		page.locator('#capabilities').getByRole('heading', { name: 'AI活用研修・ワークショップ' })
	).toBeVisible();
	const fdeMission = page.locator('[data-fde-mission]');
	await expect(
		fdeMission.getByRole('heading', { name: 'AI実装の知見を発信する、FDE Mission' })
	).toBeVisible();
	const fdeMissionLink = fdeMission.getByRole('link', { name: 'FDE Missionを見る' });
	await expect(fdeMissionLink).toHaveAttribute('href', 'https://fde-mission.cauchye.com');
	await expect(fdeMissionLink).toHaveAttribute('target', '_blank');
	await expect(fdeMissionLink.locator('svg.lucide-external-link')).toBeVisible();
	const fdeMissionBox = await fdeMission.boundingBox();
	const ctaBox = await page
		.getByRole('heading', { name: 'まず1部門から、始めませんか。' })
		.boundingBox();
	expect(fdeMissionBox).not.toBeNull();
	expect(ctaBox).not.toBeNull();
	expect(fdeMissionBox?.y ?? 0).toBeLessThan(ctaBox?.y ?? 0);
	const serviceHeadingLayout = await page
		.locator('#capabilities [data-agent-service] h3')
		.first()
		.evaluate((heading) => ({
			textWrap: getComputedStyle(heading).textWrap,
			headingWidth: heading.getBoundingClientRect().width,
			cardWidth: heading.closest('[data-agent-service]')?.getBoundingClientRect().width ?? 0
		}));
	expect(serviceHeadingLayout.textWrap).toBe('wrap');
	expect(serviceHeadingLayout.headingWidth / serviceHeadingLayout.cardWidth).toBeGreaterThan(0.8);
	await expect(page.locator('[data-agent-list] h3')).toHaveText([
		'Codex',
		'Claude Code',
		'Grok Bot'
	]);
	expect(
		await page
			.locator('[data-agent-list] [data-agent-logo]')
			.evaluateAll((images) => images.map((image) => image.getAttribute('src')))
	).toEqual(['/brands/openai.svg', '/brands/anthropic.svg', '/brands/grok.svg']);
	expect(
		await page
			.locator('[data-agent-list] [data-agent-screen]')
			.evaluateAll((images) => images.map((image) => image.getAttribute('src')))
	).toEqual([
		'/agents/codex-interface.webp',
		'/agents/claude-code-interface.png',
		'/agents/grok-bot-coordination.png'
	]);
	const breadcrumb = page.getByRole('navigation', { name: 'パンくずリスト' });
	await expect(breadcrumb.getByRole('link', { name: 'IT・AIソリューション事業' })).toHaveAttribute(
		'href',
		'/ja/business/it-ai'
	);
	await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('AIエージェント導入支援');
	const openAiLogo = await (await page.request.get('/brands/openai.svg')).text();
	expect(openAiLogo).not.toContain('#10A37F');
});

test('moves the existing technical detail to the AI solution development page', async ({
	page
}) => {
	await page.goto('/ja/business/it-ai/solution-development');
	await expect(
		page.getByRole('heading', { name: /業務に合わせたAIを、\s+使われるシステムへ。/ })
	).toBeVisible();
	expect(
		await page.locator('main section[id]').evaluateAll((sections) => sections.map(({ id }) => id))
	).toEqual(['capabilities', 'strengths', 'clients', 'faq']);
	for (const model of ['GPT', 'Claude', 'Gemini', 'Grok']) {
		await expect(page.getByText(model, { exact: true }).first()).toBeVisible();
	}
	await expect(page.getByRole('heading', { name: 'Forward Deployed Engineer' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'AIネイティブ組織開発支援' })).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'AI活用研修・ワークショップ' })).toHaveCount(0);
	const vibeProduction = page.locator('[data-vibe-production]');
	await expect(vibeProduction).toContainText('社内バイブコーディングの本番化支援');
	await expect(vibeProduction).toContainText('セキュリティと運用の専門家が診断');
	await expect(vibeProduction).toContainText('本番環境への移行から監視、障害対応、継続保守');
	const strengths = page.locator('[data-page-chapter="strengths"]');
	await expect(strengths.getByRole('heading', { name: '弊社の強み' })).toBeVisible();
	await expect(strengths.locator('#benefits')).toContainText(
		'導入後に、使える仕組みと知見が残る。'
	);
	await expect(strengths.locator('#security')).toContainText('セキュリティを、AI導入の前提に。');
	await expect(strengths.locator('#foundation')).toContainText('培ってきた経験値を共通基盤へ。');
	await expect(
		strengths.locator('#foundation a[href="https://www.d6e.ai"] svg.lucide-external-link')
	).toBeVisible();
	await expect(strengths.locator('#security li')).toHaveCount(3);
	await expect(strengths.locator('#foundation li')).toHaveCount(3);
	await expect(strengths.locator('#product')).toHaveCount(0);
	await expect(page.locator('#clients + section').getByRole('heading')).toHaveText(
		'AIネイティブな組織へ。'
	);
	await expect(page.locator('#clients + section + #faq')).toBeVisible();
	await expect(page.getByText('RAG', { exact: true })).toHaveCount(0);
	await expect(page.locator('#partners, #product')).toHaveCount(0);
	const peFund = page
		.locator('#clients')
		.getByRole('heading', { name: 'PEファンド' })
		.locator('xpath=ancestor::*[@data-slot="card"]');
	await expect(peFund).toContainText('投資先企業を対象に、AIを活用した業務変革と収益性向上');
	await expect(peFund).toContainText('投資先企業のAI活用戦略');
	await expect(page.locator('#clients').getByRole('heading', { name: 'PEファンド' })).toBeVisible();
	await expect(page.locator('#clients').getByRole('heading', { name: '事業会社' })).toBeVisible();
	await expect(page.locator('#clients h2')).toHaveCount(1);
	await expect(page.locator('#clients h3')).toHaveCount(2);
	await expect(page.locator('#clients [data-section-heading]')).toHaveCSS('display', 'block');
});

test('keeps the IT and AI marquee inside the mobile viewport', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/ja/business/it-ai');
	const hasHorizontalOverflow = await page.evaluate(
		() => document.documentElement.scrollWidth > window.innerWidth
	);
	expect(hasHorizontalOverflow).toBe(false);
});

test('keeps the long Japanese advisory CTA inside the mobile viewport', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/ja/business/corporate-advisory');
	const cta = page.getByRole('link', { name: 'コーポレートアドバイザリーについて相談する' }).last();
	const box = await cta.boundingBox();
	expect(box).not.toBeNull();
	expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
	await expect(page.locator('footer p').last()).toHaveText(
		/© \d{4} CAUCHYE ASIA PTE\. LTD\. All rights reserved\./
	);
});

test('shows localized server validation without native browser messages', async ({ page }) => {
	await page.goto('/ja/contact');
	const form = page.locator('#contact form');
	await expect(form).toHaveAttribute('novalidate', '');
	const inquiryType = form.getByLabel('お問い合わせ種別');
	await expect(inquiryType).toHaveText('選択してください');
	await inquiryType.click();
	await expect(page.getByRole('option')).toHaveText([
		'IT・AIソリューション',
		'コーポレートアドバイザリー',
		'会社について',
		'弊社への営業'
	]);
	await page.keyboard.press('Escape');
	const submitButton = form.getByRole('button', { name: '送信する' });
	await expect(submitButton.locator('svg.lucide-send')).toBeVisible();
	await submitButton.click();
	await expect(page.locator('#inquiryType-error')).toHaveText('入力してください。');
	await expect(page.locator('#name-error')).toHaveText('入力してください。');
	await expect(page.locator('#message-error')).toHaveText('10文字以上でご記入ください。');
	await expect(inquiryType).toHaveAttribute('aria-invalid', 'true');
	await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
});

test('returns locale-aware contact validation errors', async ({ request, baseURL }) => {
	if (!baseURL) throw new Error('Playwright baseURL is required.');
	const response = await request.post('/api/contact?locale=ja', {
		headers: { origin: new URL(baseURL).origin },
		multipart: {
			locale: 'ja',
			inquiryType: 'forged-category',
			name: '',
			company: '',
			email: '',
			message: ''
		}
	});
	expect(response.status()).toBe(400);
	const result = await response.json();
	expect(result.errors.inquiryType[0]).toBe('入力してください。');
	expect(result.errors.name[0]).toBe('入力してください。');
	expect(result.errors.message[0]).toBe('10文字以上でご記入ください。');
});

test('silently accepts honeypot submissions', async ({ request, baseURL }) => {
	if (!baseURL) throw new Error('Playwright baseURL is required.');
	const response = await request.post('/api/contact?locale=en', {
		headers: { origin: new URL(baseURL).origin },
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

test('keeps EmDash administration and first-admin setup closed', async ({ request }) => {
	for (const path of [
		'/_emdash/admin',
		'/_emdash/admin/setup',
		'/_emdash/admin/content/pages',
		'/_emdash/api/auth/me',
		'/_emdash/api/auth/mode',
		'/_emdash/oauth/authorize'
	]) {
		const response = await request.get(path, { maxRedirects: 0 });
		expect(response.status(), path).toBe(503);
		expect(response.headers()['cache-control']).toBe('no-store');
	}

	const setup = await request.post('/_emdash/api/setup', {
		data: { title: 'Takeover', includeContent: false }
	});
	expect(setup.status()).toBe(503);
	const admin = await request.post('/_emdash/api/setup/admin', {
		data: { email: 'attacker@example.com' }
	});
	expect(admin.status()).toBe(503);
	const magicLink = await request.post('/_emdash/api/auth/magic-link/send', {
		data: { email: 'attacker@example.com' }
	});
	expect(magicLink.status()).toBe(503);

	// Public EmDash services such as media delivery are not part of the gate.
	const media = await request.get('/_emdash/api/media/file/missing');
	expect(media.status()).toBe(404);
});

test('offers no sign-in on the public site', async ({ page }) => {
	for (const path of ['/en', '/ja/business/it-ai', '/en/contact']) {
		await page.goto(path);
		await expect(
			page.locator('a[href*="/_emdash"], a[href*="login"], a[href*="auth"]')
		).toHaveCount(0);
		await expect(page.locator('input[type="password"]')).toHaveCount(0);
	}
});

test('serves page copy, FAQs, and partners from the seeded EmDash collections', async ({
	request
}) => {
	const content = await request.get('/_emdash/api/content/pages', { maxRedirects: 0 });
	expect(content.status(), 'the content API stays private').toBe(401);

	const home = await (await request.get('/ja')).text();
	expect(home).toContain('答えはない。');
	const agents = await (await request.get('/en/business/it-ai/agent-adoption')).text();
	expect(agents).toContain('Can non-engineering teams use AI agents?');
	const overview = await (await request.get('/en/business/it-ai')).text();
	expect(overview).toContain('alt="Kyoto University Social Innovation Center"');
});
