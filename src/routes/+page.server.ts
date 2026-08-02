import { fail, type Actions } from '@sveltejs/kit';
import { z } from 'zod';

import { env } from '$env/dynamic/private';
import { CONTACT_FIELDS, contactSchema, type ContactValues } from '$lib/contact';
import { getLocale } from '$lib/paraglide/runtime';

/** Fields a bot fills in and a person never sees. */
const HONEYPOT = 'website';

/**
 * Slack reserves `&`, `<` and `>` for its own markup, so anything typed into
 * the form has to be escaped before it goes into a message.
 */
function slack(text: string) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Renders the message as a blockquote — every line needs the marker. */
function quote(text: string) {
	return slack(text)
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n');
}

function readValues(data: FormData): ContactValues {
	return Object.fromEntries(
		CONTACT_FIELDS.map((field) => [field, String(data.get(field) ?? '')])
	) as ContactValues;
}

export const actions = {
	contact: async ({ request, fetch }) => {
		const data = await request.formData();
		const values = readValues(data);

		// Silently accept spam: telling a bot it failed only invites a retry.
		if (String(data.get(HONEYPOT) ?? '') !== '') {
			return { success: true };
		}

		const parsed = contactSchema().safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: z.flattenError(parsed.error).fieldErrors });
		}

		const webhook = env.SLACK_WEBHOOK_URL;
		if (!webhook) {
			console.error('SLACK_WEBHOOK_URL is not set — contact submission was dropped.');
			return fail(500, { values, unavailable: true });
		}

		const { name, company, email, message } = parsed.data;

		// One `section` per item. Slack lays a section's `fields` array out in two
		// columns, which is what pairs unrelated values onto the same line.
		const detail = (label: string, value: string) => ({
			type: 'section',
			text: { type: 'mrkdwn', text: `*${label}*\n${value}` }
		});

		const response = await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				text: `お問い合わせ: ${slack(name)}`,
				blocks: [
					{ type: 'header', text: { type: 'plain_text', text: '新しいお問い合わせ' } },
					detail('お名前', slack(name)),
					...(company ? [detail('会社名', slack(company))] : []),
					// Linkified so it can be replied to without retyping.
					detail('メールアドレス', `<mailto:${slack(email)}|${slack(email)}>`),
					{ type: 'divider' },
					detail('ご相談内容', quote(message)),
					{
						type: 'context',
						elements: [{ type: 'mrkdwn', text: `${getLocale()} · cauchye.com` }]
					}
				]
			})
		});

		if (!response.ok) {
			console.error(`Slack webhook returned ${response.status}: ${await response.text()}`);
			return fail(502, { values, unavailable: true });
		}

		return { success: true };
	}
} satisfies Actions;
