import { describe, it, expect } from 'vitest'
import {
	Recurrence,
	IntervalRecurrence,
	RRuleRecurrence,
	type RecurrenceJSON,
} from './recurrence.js'

describe('IntervalRecurrence', () => {
	describe('nextAfter', () => {
		it('adds days to a date', () => {
			const recurrence = Recurrence.interval('P7D')
			const after = '2025-01-15T10:00:00Z'

			const result = recurrence.nextAfter(after)

			expect(result).toBe('2025-01-22T10:00:00Z')
		})

		it('adds weeks to a date', () => {
			const recurrence = Recurrence.interval('P4W')
			const after = '2025-01-01T08:30:00Z'

			const result = recurrence.nextAfter(after)

			expect(result).toBe('2025-01-29T08:30:00Z')
		})

		it('adds months to a date', () => {
			const recurrence = Recurrence.interval('P1M')
			const after = '2025-01-31T12:00:00Z'

			const result = recurrence.nextAfter(after)

			// Adding 1 month to Jan 31 results in Feb 28 (2025 is not a leap year)
			expect(result).toBe('2025-02-28T12:00:00Z')
		})

		it('adds years to a date', () => {
			const recurrence = Recurrence.interval('P1Y')
			const after = '2024-02-29T00:00:00Z' // leap year date

			const result = recurrence.nextAfter(after)

			// 2025 is not a leap year, so Feb 29 becomes Feb 28
			expect(result).toBe('2025-02-28T00:00:00Z')
		})

		it('handles complex durations', () => {
			const recurrence = Recurrence.interval('P1M2DT3H')
			const after = '2025-01-01T00:00:00Z'

			const result = recurrence.nextAfter(after)

			expect(result).toBe('2025-02-03T03:00:00Z')
		})

		it('returns null for invalid duration', () => {
			const recurrence = Recurrence.interval('invalid')

			expect(recurrence.nextAfter('2025-01-01T00:00:00Z')).toBeNull()
		})
	})

	describe('isValid', () => {
		it('returns true for valid ISO 8601 durations', () => {
			expect(Recurrence.interval('P1D').isValid).toBe(true)
			expect(Recurrence.interval('P7D').isValid).toBe(true)
			expect(Recurrence.interval('P4W').isValid).toBe(true)
			expect(Recurrence.interval('P1M').isValid).toBe(true)
			expect(Recurrence.interval('P1Y').isValid).toBe(true)
			expect(Recurrence.interval('PT1H').isValid).toBe(true)
			expect(Recurrence.interval('P1DT12H30M').isValid).toBe(true)
		})

		it('returns false for invalid durations', () => {
			expect(Recurrence.interval('7 days').isValid).toBe(false)
			expect(Recurrence.interval('weekly').isValid).toBe(false)
			expect(Recurrence.interval('').isValid).toBe(false)
			expect(Recurrence.interval('P').isValid).toBe(false)
		})
	})

	describe('toString', () => {
		it('returns human-readable description', () => {
			expect(Recurrence.interval('P1D').toString()).toBe('every 1 day')
			expect(Recurrence.interval('P7D').toString()).toBe('every 7 days')
			expect(Recurrence.interval('P4W').toString()).toBe('every 4 weeks')
			expect(Recurrence.interval('P1M').toString()).toBe('every 1 month')
		})

		it('handles invalid durations', () => {
			expect(Recurrence.interval('invalid').toString()).toBe(
				'invalid duration: invalid'
			)
		})
	})

	describe('valueOf', () => {
		it('returns the original duration string', () => {
			expect(Recurrence.interval('P4W').valueOf()).toBe('P4W')
			expect(String(Recurrence.interval('P1M'))).toBe('every 1 month')
		})
	})

	describe('toJSON', () => {
		it('returns serializable object', () => {
			const recurrence = Recurrence.interval('P4W')
			expect(recurrence.toJSON()).toEqual({ type: 'interval', duration: 'P4W' })
		})
	})
})

describe('RRuleRecurrence', () => {
	describe('nextAfter', () => {
		it('computes next weekly occurrence', () => {
			const recurrence = Recurrence.rrule('FREQ=WEEKLY;BYDAY=MO')
			// Wednesday Jan 15, 2025
			const after = '2025-01-15T10:00:00Z'

			const result = recurrence.nextAfter(after)

			// Next Monday is Jan 20, 2025
			expect(result).toContain('2025-01-20')
		})

		it('computes next monthly occurrence', () => {
			const recurrence = Recurrence.rrule('FREQ=MONTHLY;BYMONTHDAY=1')
			const after = '2025-01-15T09:00:00Z'

			const result = recurrence.nextAfter(after)

			// Next 1st is Feb 1, 2025
			expect(result).toContain('2025-02-01')
		})

		it('computes next daily occurrence', () => {
			const recurrence = Recurrence.rrule('FREQ=DAILY;INTERVAL=3')
			const after = '2025-01-10T14:00:00Z'

			const result = recurrence.nextAfter(after)

			// 3 days later is Jan 13
			expect(result).toContain('2025-01-13')
		})

		it('handles RRULE with DTSTART', () => {
			const recurrence = Recurrence.rrule(
				'DTSTART:20250101T090000Z\nRRULE:FREQ=WEEKLY;BYDAY=SU'
			)
			// Starting from Jan 15 (Wednesday)
			const after = '2025-01-15T00:00:00Z'

			const result = recurrence.nextAfter(after)

			// Next Sunday is Jan 19, 2025
			expect(result).toContain('2025-01-19')
		})

		it('returns null when no more occurrences (COUNT exhausted)', () => {
			const recurrence = Recurrence.rrule(
				'DTSTART:20250101T090000Z\nRRULE:FREQ=DAILY;COUNT=3'
			)
			// After all 3 occurrences (Jan 1, 2, 3)
			const after = '2025-01-10T00:00:00Z'

			const result = recurrence.nextAfter(after)

			expect(result).toBeNull()
		})

		it('returns null when UNTIL date passed', () => {
			const recurrence = Recurrence.rrule(
				'DTSTART:20250101T090000Z\nRRULE:FREQ=DAILY;UNTIL=20250105T090000Z'
			)
			const after = '2025-01-10T00:00:00Z'

			const result = recurrence.nextAfter(after)

			expect(result).toBeNull()
		})
	})

	describe('nextAfter with timezone', () => {
		it('computes occurrence with timezone consideration', () => {
			const recurrence = Recurrence.rrule('FREQ=WEEKLY;BYDAY=SU')
			const after = '2025-01-15T00:00:00Z'

			const resultUTC = recurrence.nextAfter(after, 'UTC')
			const resultNY = recurrence.nextAfter(after, 'America/New_York')

			// Both should return valid dates
			expect(resultUTC).not.toBeNull()
			expect(resultNY).not.toBeNull()

			// UTC result should be Sunday Jan 19
			expect(resultUTC).toContain('2025-01-19')

			// NY result may differ due to timezone offset
			expect(resultNY).toMatch(/2025-01-1[89]/)
		})

		it('handles RRULE with embedded TZID', () => {
			const recurrence = Recurrence.rrule(
				'DTSTART;TZID=America/Denver:20250101T190000\nRRULE:FREQ=WEEKLY;BYDAY=WE'
			)
			const after = '2025-01-15T00:00:00Z'

			const result = recurrence.nextAfter(after)

			expect(result).not.toBeNull()
			expect(result).toContain('2025-01')
		})
	})

	describe('isValid', () => {
		it('returns true for valid RRULE', () => {
			expect(Recurrence.rrule('FREQ=DAILY').isValid).toBe(true)
			expect(Recurrence.rrule('FREQ=WEEKLY;BYDAY=MO,WE,FR').isValid).toBe(true)
			expect(Recurrence.rrule('FREQ=MONTHLY;BYMONTHDAY=15').isValid).toBe(true)
			expect(Recurrence.rrule('FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1').isValid).toBe(
				true
			)
		})

		it('returns true for RRULE with DTSTART', () => {
			expect(
				Recurrence.rrule('DTSTART:20250101T090000Z\nRRULE:FREQ=DAILY').isValid
			).toBe(true)
		})

		it('returns false for invalid RRULE', () => {
			expect(Recurrence.rrule('FREQ=INVALID').isValid).toBe(false)
			expect(Recurrence.rrule('not a rule').isValid).toBe(false)
			expect(Recurrence.rrule('').isValid).toBe(false)
		})
	})

	describe('toString', () => {
		it('returns human-readable description', () => {
			expect(Recurrence.rrule('FREQ=DAILY').toString()).toBe('every day')
			expect(Recurrence.rrule('FREQ=WEEKLY').toString()).toBe('every week')
			expect(Recurrence.rrule('FREQ=MONTHLY').toString()).toBe('every month')
		})

		it('describes complex rules', () => {
			const description = Recurrence.rrule('FREQ=WEEKLY;BYDAY=MO,WE,FR').toString()
			expect(description).toContain('week')
			expect(description).toContain('Monday')
			expect(description).toContain('Wednesday')
			expect(description).toContain('Friday')
		})

		it('handles invalid RRULE', () => {
			expect(Recurrence.rrule('invalid').toString()).toBe('invalid rrule: invalid')
		})
	})

	describe('valueOf', () => {
		it('returns the original rule string', () => {
			expect(Recurrence.rrule('FREQ=WEEKLY;BYDAY=SU').valueOf()).toBe(
				'FREQ=WEEKLY;BYDAY=SU'
			)
		})
	})

	describe('toJSON', () => {
		it('returns serializable object', () => {
			const recurrence = Recurrence.rrule('FREQ=WEEKLY;BYDAY=SU')
			expect(recurrence.toJSON()).toEqual({
				type: 'rrule',
				rule: 'FREQ=WEEKLY;BYDAY=SU',
			})
		})
	})
})

describe('Recurrence.from', () => {
	it('creates IntervalRecurrence from JSON', () => {
		const json: RecurrenceJSON = { type: 'interval', duration: 'P4W' }
		const recurrence = Recurrence.from(json)

		expect(recurrence).toBeInstanceOf(IntervalRecurrence)
		expect(recurrence.type).toBe('interval')
		expect(recurrence.valueOf()).toBe('P4W')
	})

	it('creates RRuleRecurrence from JSON', () => {
		const json: RecurrenceJSON = { type: 'rrule', rule: 'FREQ=WEEKLY' }
		const recurrence = Recurrence.from(json)

		expect(recurrence).toBeInstanceOf(RRuleRecurrence)
		expect(recurrence.type).toBe('rrule')
		expect(recurrence.valueOf()).toBe('FREQ=WEEKLY')
	})

	it('auto-detects interval from string starting with P', () => {
		const recurrence = Recurrence.from('P4W')

		expect(recurrence).toBeInstanceOf(IntervalRecurrence)
		expect(recurrence.isValid).toBe(true)
	})

	it('auto-detects rrule from string not starting with P', () => {
		const recurrence = Recurrence.from('FREQ=WEEKLY')

		expect(recurrence).toBeInstanceOf(RRuleRecurrence)
		expect(recurrence.isValid).toBe(true)
	})
})

describe('Recurrence round-trip serialization', () => {
	it('round-trips IntervalRecurrence through JSON', () => {
		const original = Recurrence.interval('P2W')
		const json = original.toJSON()
		const restored = Recurrence.from(json)

		expect(restored.valueOf()).toBe(original.valueOf())
		expect(restored.nextAfter('2025-01-01T00:00:00Z')).toBe(
			original.nextAfter('2025-01-01T00:00:00Z')
		)
	})

	it('round-trips RRuleRecurrence through JSON', () => {
		const original = Recurrence.rrule('FREQ=MONTHLY;BYMONTHDAY=15')
		const json = original.toJSON()
		const restored = Recurrence.from(json)

		expect(restored.valueOf()).toBe(original.valueOf())
		expect(restored.nextAfter('2025-01-01T00:00:00Z')).toBe(
			original.nextAfter('2025-01-01T00:00:00Z')
		)
	})
})
