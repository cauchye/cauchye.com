import { fail, type Actions } from '@sveltejs/kit';
import { z } from 'zod';

import { env } from '$env/dynamic/private';
import { CONTACT_FIELDS, contactSchema, type ContactValues } from '$lib/contact';
import { getLocale } from '$lib/paraglide/runtime';

/** Fields a bot fills in and a person never sees. */
const HONEYPOT = 'website';

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
		const response = await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				text: `New enquiry from ${name}`,
				blocks: [
					{
						type: 'header',
						text: { type: 'plain_text', text: 'New enquiry — cauchye.com' }
					},
					{
						type: 'section',
						fields: [
							{ type: 'mrkdwn', text: `*Name*\n${name}` },
							{ type: 'mrkdwn', text: `*Company*\n${company || '—'}` },
							{ type: 'mrkdwn', text: `*Email*\n${email}` },
							{ type: 'mrkdwn', text: `*Locale*\n${getLocale()}` }
						]
					},
					{ type: 'section', text: { type: 'mrkdwn', text: `*Message*\n${message}` } }
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
