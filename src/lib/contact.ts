import { z } from 'zod';

import { m } from '$lib/paraglide/messages';

export const CONTACT_FIELDS = ['name', 'company', 'email', 'message'] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

/** Values echoed back to the form so a failed submit does not lose typing. */
export type ContactValues = Record<ContactField, string>;

export const emptyContactValues: ContactValues = {
	name: '',
	company: '',
	email: '',
	message: ''
};

/**
 * Built per call rather than at module load: the validation messages come from
 * Paraglide, which resolves against the locale of the current request.
 */
export function contactSchema() {
	return z.object({
		name: z.string().trim().min(1, m.form_error_required()).max(100, m.form_error_too_long()),
		company: z.string().trim().max(100, m.form_error_too_long()),
		// `min` before the email check so a blank field reads "required" rather
		// than "not an email address".
		email: z
			.string()
			.trim()
			.min(1, m.form_error_required())
			.max(200, m.form_error_too_long())
			.pipe(z.email(m.form_error_email())),
		message: z
			.string()
			.trim()
			.min(10, m.form_error_message_short())
			.max(4000, m.form_error_too_long())
	});
}

export type ContactInput = z.infer<ReturnType<typeof contactSchema>>;

/**
 * What the contact action hands back. Declared here rather than imported from
 * the route's `$types` so the form component stays independent of where the
 * action happens to live.
 */
export type ContactActionResult =
	| {
			success?: boolean;
			values?: ContactValues;
			errors?: Partial<Record<ContactField, string[]>>;
			unavailable?: boolean;
	  }
	| null
	| undefined;
