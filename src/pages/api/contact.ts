import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import { z } from 'zod';

import {
	type ContactInquiryType,
	contactSchema,
	escapeSlackMrkdwn,
	MEETING_TOOLS,
	readAttribution,
	readBooking,
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

function fallbackRedirect(
	request: Request,
	locale: Locale,
	state: 'success' | 'error',
	page: 'contact' | 'book' = 'contact'
) {
	// Native form posts can report a generic outcome without putting contact values in the URL.
	// Field-level errors and value preservation are provided by the progressively enhanced form.
	const target = new URL(`/${locale}/${page}`, request.url);
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

	const isBooking = String(data.get('mode') ?? '') === 'book';
	const parsed = contactSchema(messages).safeParse(values);
	const bookingResult = readBooking(data, messages, isBooking);
	if (!parsed.success || Object.keys(bookingResult.errors).length) {
		const errors = {
			...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors),
			...bookingResult.errors
		};
		return wantsHtml(request)
			? fallbackRedirect(request, locale, 'error', isBooking ? 'book' : 'contact')
			: json({ values, errors }, 400);
	}

	const webhook = env.SLACK_WEBHOOK_URL;
	if (!webhook) {
		console.error('Contact submission unavailable: SLACK_WEBHOOK_URL is not configured.');
		return wantsHtml(request)
			? fallbackRedirect(request, locale, 'error', isBooking ? 'book' : 'contact')
			: json({ values, unavailable: true }, 503);
	}

	const { inquiryType, name, company, email, message } = parsed.data;
	const { booking } = bookingResult;
	const toolLabels: Record<(typeof MEETING_TOOLS)[number], string> = {
		'google-meet': 'Google Meet',
		zoom: 'Zoom',
		teams: 'Microsoft Teams',
		any: '指定なし'
	};
	const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
	const bookingText = booking
		? booking.slots
				.map((slot, index) => {
					const weekday = weekdays[new Date(`${slot.date}T00:00:00Z`).getUTCDay()];
					return `第${index + 1}希望: ${slot.date}（${weekday}）${slot.time}〜（30分・JST）`;
				})
				.join('\n') + `\nオンライン会議: ${toolLabels[booking.meetingTool]}`
		: '';
	const inquiryTypeLabels: Record<ContactInquiryType, string> = {
		'it-ai': messages.form_inquiry_it_ai,
		'corporate-advisory': messages.form_inquiry_advisory,
		company: messages.form_inquiry_company,
		sales: messages.form_inquiry_sales
	};
	const inquiryTypeLabel = inquiryTypeLabels[inquiryType];
	const messageChunks = message ? splitSlackMessage(message) : [];
	const attribution = readAttribution(data);
	const attributionText = [
		`流入元: ${attribution.utm_source ? `utm_source=${attribution.utm_source}` : attribution.referrer ? `referrer=${attribution.referrer}` : 'リファラなし（直接・メールアプリ等）'}`,
		...(attribution.utm_medium ? [`utm_medium=${attribution.utm_medium}`] : []),
		...(attribution.utm_campaign ? [`utm_campaign=${attribution.utm_campaign}`] : []),
		...(attribution.utm_content ? [`utm_content=${attribution.utm_content}`] : []),
		...(attribution.utm_term ? [`utm_term=${attribution.utm_term}`] : []),
		...(attribution.utm_source && attribution.referrer ? [`referrer=${attribution.referrer}`] : []),
		`着地ページ: ${attribution.landing ?? '不明'}`,
		...(attribution.cta ? [`押したボタン: ${attribution.cta}`] : [])
	].join('\n');
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
				text: `${booking ? 'MTG予約リクエスト' : 'お問い合わせ'}（${escapeSlackMrkdwn(inquiryTypeLabel)}）: ${escapeSlackMrkdwn(name)}`,
				blocks: [
					{
						type: 'header',
						text: {
							type: 'plain_text',
							text: booking ? '新しいMTG予約リクエスト' : '新しいお問い合わせ'
						}
					},
					...(booking ? [detail('希望日時', escapeSlackMrkdwn(bookingText))] : []),
					detail('お問い合わせ種別', escapeSlackMrkdwn(inquiryTypeLabel)),
					detail('お名前', escapeSlackMrkdwn(name)),
					...(company ? [detail('会社名', escapeSlackMrkdwn(company))] : []),
					detail(
						'メールアドレス',
						`<mailto:${escapeSlackMrkdwn(email)}|${escapeSlackMrkdwn(email)}>`
					),
					{ type: 'divider' },
					...(messageChunks.length
						? messageChunks.map((chunk, index) =>
								detail(index === 0 ? 'ご相談内容' : `ご相談内容（続き ${index + 1}）`, chunk)
							)
						: [detail('ご相談内容', '（未記入）')]),
					{ type: 'divider' },
					detail('流入情報', escapeSlackMrkdwn(attributionText)),
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
			? fallbackRedirect(request, locale, 'error', isBooking ? 'book' : 'contact')
			: json({ values, unavailable: true }, 502);
	}

	if (!response.ok) {
		console.error('Slack webhook rejected a contact submission.', { status: response.status });
		return wantsHtml(request)
			? fallbackRedirect(request, locale, 'error', isBooking ? 'book' : 'contact')
			: json({ values, unavailable: true }, 502);
	}

	return wantsHtml(request)
		? fallbackRedirect(request, locale, 'success', isBooking ? 'book' : 'contact')
		: json({ success: true }, 200);
};
