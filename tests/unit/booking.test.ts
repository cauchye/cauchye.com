import { describe, expect, it } from 'vitest';

import { BOOKING_TIMES, bookingWindow, readBooking } from '../../src/contact';
import { getDictionary } from '../../src/i18n';

const messages = getDictionary('ja');
// Thursday 2026-10-15 22:00 JST.
const now = new Date('2026-10-15T13:00:00Z');

function form(values: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, value);
	return data;
}

describe('booking', () => {
	it('offers 30-minute starts from 10:00 to 17:30', () => {
		expect(BOOKING_TIMES[0]).toBe('10:00');
		expect(BOOKING_TIMES.at(-1)).toBe('17:30');
		expect(BOOKING_TIMES).toHaveLength(16);
	});

	it('opens two business days ahead and closes three weeks ahead (Tokyo dates)', () => {
		// Thu → Fri (1), Mon (2).
		expect(bookingWindow(now)).toEqual({ min: '2026-10-19', max: '2026-11-05' });
	});

	it('accepts valid slots and the meeting tool', () => {
		const result = readBooking(
			form({
				slot1_date: '2026-10-19',
				slot1_time: '10:00',
				slot3_date: '2026-11-05',
				slot3_time: '17:30',
				meetingTool: 'zoom'
			}),
			messages,
			true,
			now
		);
		expect(result.errors).toEqual({});
		expect(result.booking).toEqual({
			slots: [
				{ date: '2026-10-19', time: '10:00' },
				{ date: '2026-11-05', time: '17:30' }
			],
			meetingTool: 'zoom'
		});
	});

	it('rejects weekends, out-of-range dates, off-grid times, and duplicates', () => {
		const result = readBooking(
			form({
				slot1_date: '2026-10-24',
				slot1_time: '10:00',
				slot2_date: '2026-10-16',
				slot2_time: '18:00',
				slot3_date: '2026-11-06',
				slot3_time: '11:00',
				meetingTool: 'teams'
			}),
			messages,
			true,
			now
		);
		expect(result.booking).toBeUndefined();
		expect(Object.keys(result.errors).sort()).toEqual(['slot1', 'slot2', 'slot3']);
	});

	it('requires the first slot on the booking page only', () => {
		expect(readBooking(form({}), messages, true, now).errors.slot1).toBeDefined();
		expect(readBooking(form({}), messages, false, now)).toEqual({ errors: {} });
	});
});
