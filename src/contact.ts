import { z } from 'zod';

import type { Dictionary } from './i18n';

export const CONTACT_INQUIRY_TYPES = ['it-ai', 'corporate-advisory', 'company', 'sales'] as const;
export const CONTACT_FIELDS = ['inquiryType', 'name', 'company', 'email', 'message'] as const;
// Where the visitor came from, filled in by the page from the first page of the visit.
export const ATTRIBUTION_FIELDS = [
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_content',
	'utm_term',
	'landing',
	'referrer',
	'cta'
] as const;
export type AttributionField = (typeof ATTRIBUTION_FIELDS)[number];

// Attribution values, trimmed and capped; empty ones are left out.
export function readAttribution(data: FormData): Partial<Record<AttributionField, string>> {
	const result: Partial<Record<AttributionField, string>> = {};
	for (const field of ATTRIBUTION_FIELDS) {
		const value = String(data.get(field) ?? '')
			.trim()
			.slice(0, 300);
		if (value) result[field] = value;
	}
	return result;
}
export const SLACK_MESSAGE_CHUNK_LIMIT = 2900;
export type ContactInquiryType = (typeof CONTACT_INQUIRY_TYPES)[number];
export type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactValues = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string[]>>;

export function contactSchema(messages: Dictionary) {
	return z.object({
		inquiryType: z.enum(CONTACT_INQUIRY_TYPES, { error: messages.form_error_required }),
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
		// Optional: a first meeting matters more than a full brief.
		message: z.string().trim().max(4000, messages.form_error_too_long)
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

// Meeting requests: up to three preferred 30-minute slots on weekdays, 10:00–18:00 JST,
// from two business days ahead to three weeks ahead. Japanese public holidays are not
// excluded; staff adjust by reply when one is picked.
export const BOOKING_SLOTS = ['slot1', 'slot2', 'slot3'] as const;
export const MEETING_TOOLS = ['google-meet', 'zoom', 'teams', 'any'] as const;
export type BookingSlot = (typeof BOOKING_SLOTS)[number];
export type MeetingTool = (typeof MEETING_TOOLS)[number];
export const BOOKING_TIMES: readonly string[] = Array.from({ length: 16 }, (_, index) => {
	const minutes = 10 * 60 + index * 30;
	return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
});
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Today's date in Tokyo, as a UTC midnight timestamp.
function tokyoToday(now: Date): number {
	const tokyo = new Date(now.getTime() + JST_OFFSET_MS);
	return Date.UTC(tokyo.getUTCFullYear(), tokyo.getUTCMonth(), tokyo.getUTCDate());
}

function isWeekend(day: number): boolean {
	const weekday = new Date(day).getUTCDay();
	return weekday === 0 || weekday === 6;
}

function isoDate(day: number): string {
	return new Date(day).toISOString().slice(0, 10);
}

// First and last dates a slot can be on (YYYY-MM-DD, Tokyo).
export function bookingWindow(now = new Date()): { min: string; max: string } {
	const today = tokyoToday(now);
	let day = today;
	let businessDays = 0;
	while (businessDays < 2) {
		day += DAY_MS;
		if (!isWeekend(day)) businessDays += 1;
	}
	return { min: isoDate(day), max: isoDate(today + 21 * DAY_MS) };
}

export interface BookingRequest {
	slots: { date: string; time: string }[];
	meetingTool: MeetingTool;
}

// Reads and checks the slots of a meeting request. `required` makes the first slot and the
// meeting tool mandatory (the booking page); otherwise an empty request is fine.
export function readBooking(
	data: FormData,
	messages: Dictionary,
	required: boolean,
	now = new Date()
): { booking?: BookingRequest; errors: Partial<Record<BookingSlot | 'meetingTool', string[]>> } {
	const errors: Partial<Record<BookingSlot | 'meetingTool', string[]>> = {};
	const { min, max } = bookingWindow(now);
	const slots: { date: string; time: string }[] = [];
	const seen = new Set<string>();

	for (const slot of BOOKING_SLOTS) {
		const date = String(data.get(`${slot}_date`) ?? '').trim();
		const time = String(data.get(`${slot}_time`) ?? '').trim();
		if (!date && !time) {
			if (required && slot === 'slot1') errors[slot] = [messages.booking_error_required];
			continue;
		}
		const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN;
		if (!date || !time || Number.isNaN(day) || !BOOKING_TIMES.includes(time)) {
			errors[slot] = [messages.booking_error_incomplete];
		} else if (date < min || date > max || isWeekend(day)) {
			errors[slot] = [messages.booking_error_range];
		} else if (seen.has(`${date} ${time}`)) {
			errors[slot] = [messages.booking_error_duplicate];
		} else {
			seen.add(`${date} ${time}`);
			slots.push({ date, time });
		}
	}

	const toolValue = String(data.get('meetingTool') ?? '').trim();
	const meetingTool = (MEETING_TOOLS as readonly string[]).includes(toolValue)
		? (toolValue as MeetingTool)
		: undefined;
	if (toolValue && !meetingTool) errors.meetingTool = [messages.booking_error_required];
	if (required && !toolValue) errors.meetingTool = [messages.booking_error_required];

	if (Object.keys(errors).length || slots.length === 0) return { errors };
	return { booking: { slots, meetingTool: meetingTool ?? 'any' }, errors };
}
