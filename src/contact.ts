import { z } from 'zod';

import type { Dictionary } from './i18n';

export const CONTACT_FIELDS = ['name', 'company', 'email', 'message'] as const;
export const SLACK_MESSAGE_CHUNK_LIMIT = 2900;
export type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactValues = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string[]>>;

export function contactSchema(messages: Dictionary) {
	return z.object({
		name: z
			.string()
			.trim()
			.min(1, messages.form_error_required)
			.max(100, messages.form_error_too_long),
		company: z.string().trim().max(100, messages.form_error_too_long),
		email: z
			.string()
			.trim()
			.min(1, messages.form_error_required)
			.max(200, messages.form_error_too_long)
			.pipe(z.email(messages.form_error_email)),
		message: z
			.string()
			.trim()
			.min(10, messages.form_error_message_short)
			.max(4000, messages.form_error_too_long)
	});
}

export function readContactValues(data: FormData): ContactValues {
	return Object.fromEntries(
		CONTACT_FIELDS.map((field) => [field, String(data.get(field) ?? '')])
	) as ContactValues;
}

export function escapeSlackMrkdwn(text: string) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function splitSlackMessage(
	message: string,
	maxLength = SLACK_MESSAGE_CHUNK_LIMIT
): string[] {
	if (maxLength < 7) throw new RangeError('Slack message chunks must allow escaped characters.');

	const tokens = ['> '];
	for (const character of message) {
		tokens.push(character === '\n' ? '\n> ' : escapeSlackMrkdwn(character));
	}

	const chunks: string[] = [];
	let chunk = '';
	for (const token of tokens) {
		if (chunk && chunk.length + token.length > maxLength) {
			chunks.push(chunk);
			chunk = '> ';
		}
		chunk += token;
	}
	if (chunk) chunks.push(chunk);

	return chunks;
}
