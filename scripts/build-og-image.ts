// Renders public/og-default.png, the 1200x630 share image of pages without their own, from
// the brand mark and the Inter typeface with Playwright's Chromium.
// Usage: pnpm run og:build
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import en from '../messages/en.json' with { type: 'json' };
import { defaultShareImage, site } from '../src/site.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const mark = readFileSync(`${root}public/favicon.svg`, 'utf8');
const font = readFileSync(
	`${root}node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2`
).toString('base64');
const { width, height } = defaultShareImage;

const html = `<!doctype html>
<style>
	@font-face {
		font-family: Inter;
		font-weight: 100 900;
		src: url(data:font/woff2;base64,${font}) format('woff2');
	}
	* { box-sizing: border-box; margin: 0; }
	body {
		width: ${width}px;
		height: ${height}px;
		padding: 72px 80px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		font-family: Inter, sans-serif;
		color: #fff;
		background:
			radial-gradient(900px 520px at 88% 12%, rgb(41 171 226 / 0.34), transparent 70%),
			linear-gradient(135deg, #0b1437 0%, #1a2f8f 58%, #2f55d4 100%);
	}
	body::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px),
			linear-gradient(90deg, rgb(255 255 255 / 0.06) 1px, transparent 1px);
		background-size: 60px 60px;
	}
	header, main, footer { position: relative; }
	header { display: flex; align-items: center; gap: 20px; }
	.mark { width: 92px; height: 92px; padding: 6px; border-radius: 24px; background: #fff; }
	.mark svg { display: block; width: 100%; height: 100%; }
	.legal { font-size: 26px; font-weight: 500; letter-spacing: 0.08em; opacity: 0.86; }
	h1 { font-size: 148px; font-weight: 700; letter-spacing: 0.04em; line-height: 1; }
	p { margin-top: 28px; font-size: 40px; font-weight: 400; opacity: 0.9; }
	footer { font-size: 26px; font-weight: 500; letter-spacing: 0.06em; opacity: 0.8; }
</style>
<header><div class="mark">${mark}</div><span class="legal">${site.legalName}</span></header>
<main><h1>${site.shortName}</h1><p>${en.brand_descriptor}</p></main>
<footer>${new URL(site.url).host}</footer>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}public${defaultShareImage.path}`, type: 'png' });
await browser.close();
console.log(`Wrote public${defaultShareImage.path} (${width}x${height})`);
