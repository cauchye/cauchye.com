import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { z } from 'zod';

import {
	contactSchema,
	escapeSlackMrkdwn,
	readContactValues,
	splitSlackMessage
} from '../../contact';
import { getDictionary, isLocale, type Locale } from '../../i18n';

const MAX_BODY_BYTES = 16_384;

class BodyTooLargeError extends Error {}

function json(body: object, status: number) {
	return Response.json(body, {
		status,
		headers: {
			'cache-control': 'no-store',
			'content-type': 'application/json; charset=utf-8'
		}
	});
}

function wantsHtml(request: Request) {
	return request.headers.get('accept')?.includes('text/html') ?? false;
}

function fallbackRedirect(request: Request, locale: Locale, state: 'success' | 'error') {
	// Native form posts can report a generic outcome without putting contact values in the URL.
	// Field-level errors and value preservation are provided by the progressively enhanced form.
	const target = new URL(`/${locale}`, request.url);
	target.searchParams.set('contact', state);
	target.hash = 'contact';
	return Response.redirect(target, 303);
}

async function readLimitedFormData(request: Request) {
	if (!request.body) return new FormData();

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > MAX_BODY_BYTES) {
			await reader.cancel();
			throw new BodyTooLargeError();
		}
		chunks.push(value);
	}

	const body = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return new Request(request.url, {
		method: request.method,
		headers: request.headers,
		body
	}).formData();
}

export const POST: APIRoute = async ({ request }) => {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > MAX_BODY_BYTES) {
		return json({ unavailable: true }, 413);
	}

	let data: FormData;
	try {
		data = await readLimitedFormData(request);
	} catch (error) {
		if (error instanceof BodyTooLargeError) {
			return json({ unavailable: true }, 413);
		}
		return json({ unavailable: true }, 400);
	}

	const localeValue = String(
		data.get('locale') ?? new URL(request.url).searchParams.get('locale') ?? ''
	);
	const locale = isLocale(localeValue) ? localeValue : 'en';
	const messages = getDictionary(locale);
	const values = readContactValues(data);

	if (String(data.get('website') ?? '') !== '') {
		return wantsHtml(request)
			? fallbackRedirect(request, locale, 'success')
			: json({ success: true }, 200);
	}

	const parsed = contactSchema(messages).safeParse(values);
	if (!parsed.success) {
		const errors = z.flattenError(parsed.error).fieldErrors;
		return wantsHtml(request)
			? fallbackRedirect(request, locale, 'error')
			: json({ values, errors }, 400);
	}

	const webhook = env.SLACK_WEBHOOK_URL;
	if (!webhook) {
		console.error('Contact submission unavailable: SLACK_WEBHOOK_URL is not configured.');
		return wantsHtml(request)
			? fallbackRedirect(request, locale, 'error')
			: json({ values, unavailable: true }, 503);
	}

	const { name, company, email, message } = parsed.data;
	const messageChunks = splitSlackMessage(message);
	const detail = (label: string, value: string) => ({
		type: 'section',
		text: { type: 'mrkdwn', text: `*${label}*\n${value}` }
	});

	let response: Response;
	try {
		response = await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				text: `お問い合わせ: ${escapeSlackMrkdwn(name)}`,
				blocks: [
					{ type: 'header', text: { type: 'plain_text', text: '新しいお問い合わせ' } },
					detail('お名前', escapeSlackMrkdwn(name)),
					...(company ? [detail('会社名', escapeSlackMrkdwn(company))] : []),
					detail(
						'メールアドレス',
						`<mailto:${escapeSlackMrkdwn(email)}|${escapeSlackMrkdwn(email)}>`
					),
					{ type: 'divider' },
					...messageChunks.map((chunk, index) =>
						detail(index === 0 ? 'ご相談内容' : `ご相談内容（続き ${index + 1}）`, chunk)
					),
					{
						type: 'context',
						elements: [{ type: 'mrkdwn', text: `${locale} · cauchye.com` }]
					}
				]
			})
		});
	} catch (error) {
		console.error('Contact submission failed while calling Slack.', error);
		return wantsHtml(request)
			? fallbackRedirect(request, locale, 'error')
			: json({ values, unavailable: true }, 502);
	}

	if (!response.ok) {
		console.error('Slack webhook rejected a contact submission.', { status: response.status });
		return wantsHtml(request)
			? fallbackRedirect(request, locale, 'error')
			: json({ values, unavailable: true }, 502);
	}

	return wantsHtml(request)
		? fallbackRedirect(request, locale, 'success')
		: json({ success: true }, 200);
};
