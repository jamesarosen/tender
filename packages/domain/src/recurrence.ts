import rruleLib, { type RRule as RRuleType } from 'rrule'
const { RRule, rrulestr } = rruleLib
import { Temporal } from 'temporal-polyfill'

/**
 * Common interface for all recurrence patterns.
 */
export interface Recurrence {
	/**
	 * Computes the next occurrence after the given date.
	 * @param after - ISO 8601 UTC timestamp string
	 * @param timezone - Optional IANA timezone for interpretation
	 * @returns ISO 8601 UTC timestamp string, or null if no next occurrence
	 */
	nextAfter(after: string, timezone?: string): string | null

	/**
	 * Returns a human-readable description of the recurrence pattern.
	 */
	toString(): string

	/**
	 * Returns the serializable value (the original rule string).
	 */
	valueOf(): string

	/**
	 * Returns true if this recurrence pattern is valid.
	 */
	readonly isValid: boolean

	/**
	 * The type discriminator for serialization.
	 */
	readonly type: 'interval' | 'rrule'
}

/**
 * Serialized form for JSON storage.
 */
export type RecurrenceJSON =
	| { type: 'interval'; duration: string }
	| { type: 'rrule'; rule: string }

const VALID_FREQUENCIES = [
	'YEARLY',
	'MONTHLY',
	'WEEKLY',
	'DAILY',
	'HOURLY',
	'MINUTELY',
	'SECONDLY',
]

/**
 * Recurrence based on ISO 8601 duration (e.g., "P4W" for 4 weeks).
 */
export class IntervalRecurrence implements Recurrence {
	readonly type = 'interval' as const
	readonly isValid: boolean
	private readonly duration: Temporal.Duration | null

	constructor(private readonly durationString: string) {
		try {
			this.duration = Temporal.Duration.from(durationString)
			this.isValid = true
		} catch {
			this.duration = null
			this.isValid = false
		}
	}

	nextAfter(after: string): string | null {
		if (!this.duration) {
			return null
		}
		const instant = Temporal.Instant.from(after)
		const zonedDateTime = instant.toZonedDateTimeISO('UTC')
		const next = zonedDateTime.add(this.duration)
		return next.toInstant().toString()
	}

	toString(): string {
		if (!this.duration) {
			return `invalid duration: ${this.durationString}`
		}
		return formatDuration(this.duration)
	}

	valueOf(): string {
		return this.durationString
	}

	toJSON(): RecurrenceJSON {
		return { type: 'interval', duration: this.durationString }
	}
}

/**
 * Recurrence based on RFC 5545 RRULE (e.g., "FREQ=WEEKLY;BYDAY=SU").
 */
export class RRuleRecurrence implements Recurrence {
	readonly type = 'rrule' as const
	readonly isValid: boolean
	private readonly hasDtstart: boolean
	// Only cache rule if it has embedded DTSTART (immutable)
	private readonly cachedRule: RRuleType | null

	constructor(private readonly ruleString: string) {
		this.hasDtstart = ruleString.includes('DTSTART')
		const validation = validateAndParseRRule(ruleString)
		this.isValid = validation.isValid
		// Only cache if DTSTART is embedded - otherwise we need to create fresh each time
		this.cachedRule = this.hasDtstart ? validation.rule : null
	}

	nextAfter(after: string, timezone?: string): string | null {
		if (!this.isValid) {
			return null
		}

		const afterDate = new Date(after)
		let rule: RRuleType

		if (this.cachedRule) {
			// Rule has embedded DTSTART, use cached version
			rule = this.cachedRule
		} else {
			// No DTSTART - create rule with afterDate as dtstart
			try {
				const options = RRule.parseString(this.ruleString)
				if (timezone) {
					options.tzid = timezone
				}
				options.dtstart = afterDate
				rule = new RRule(options)
			} catch {
				return null
			}
		}

		const next = rule.after(afterDate, false)
		return next ? next.toISOString() : null
	}

	toString(): string {
		if (!this.isValid) {
			return `invalid rrule: ${this.ruleString}`
		}
		try {
			// Create a temporary rule for display purposes
			if (this.cachedRule) {
				return this.cachedRule.toText()
			}
			const options = RRule.parseString(this.ruleString)
			const rule = new RRule(options)
			return rule.toText()
		} catch {
			return this.ruleString
		}
	}

	valueOf(): string {
		return this.ruleString
	}

	toJSON(): RecurrenceJSON {
		return { type: 'rrule', rule: this.ruleString }
	}
}

/**
 * Factory for creating Recurrence instances from various inputs.
 */
export const Recurrence = {
	/**
	 * Creates a Recurrence from a serialized JSON object or string.
	 *
	 * @param input - RecurrenceJSON object, or a string (auto-detected as interval or rrule)
	 * @returns IntervalRecurrence or RRuleRecurrence instance
	 */
	from(input: RecurrenceJSON | string): Recurrence {
		if (typeof input === 'string') {
			return Recurrence.fromString(input)
		}
		if (input.type === 'interval') {
			return new IntervalRecurrence(input.duration)
		}
		return new RRuleRecurrence(input.rule)
	},

	/**
	 * Creates a Recurrence from a string, auto-detecting the type.
	 * Strings starting with 'P' are treated as ISO 8601 durations.
	 * All other strings are treated as RRULE.
	 */
	fromString(value: string): Recurrence {
		// ISO 8601 durations start with 'P'
		if (value.startsWith('P')) {
			return new IntervalRecurrence(value)
		}
		return new RRuleRecurrence(value)
	},

	/**
	 * Creates an interval recurrence from an ISO 8601 duration string.
	 */
	interval(duration: string): IntervalRecurrence {
		return new IntervalRecurrence(duration)
	},

	/**
	 * Creates an RRULE recurrence from an RFC 5545 RRULE string.
	 */
	rrule(rule: string): RRuleRecurrence {
		return new RRuleRecurrence(rule)
	},
}

// ============================================================================
// Helper functions
// ============================================================================

function validateAndParseRRule(ruleString: string): {
	isValid: boolean
	rule: RRuleType | null
} {
	if (!ruleString || ruleString.trim() === '') {
		return { isValid: false, rule: null }
	}

	try {
		// Extract and validate FREQ
		const freqMatch = ruleString.match(/FREQ=([A-Z]+)/i)
		if (freqMatch) {
			const freq = freqMatch[1]?.toUpperCase()
			if (!freq || !VALID_FREQUENCIES.includes(freq)) {
				return { isValid: false, rule: null }
			}
		} else if (!ruleString.includes('DTSTART')) {
			return { isValid: false, rule: null }
		}

		let rule: RRuleType
		if (ruleString.includes('DTSTART') || ruleString.includes('RRULE:')) {
			rule = rrulestr(ruleString) as RRuleType
		} else {
			const options = RRule.parseString(ruleString)
			if (options.freq === undefined || options.freq === null) {
				return { isValid: false, rule: null }
			}
			rule = new RRule(options)
		}
		return { isValid: true, rule }
	} catch {
		return { isValid: false, rule: null }
	}
}

function formatDuration(duration: Temporal.Duration): string {
	const parts: string[] = []

	if (duration.years) {
		parts.push(`${duration.years} year${duration.years !== 1 ? 's' : ''}`)
	}
	if (duration.months) {
		parts.push(`${duration.months} month${duration.months !== 1 ? 's' : ''}`)
	}
	if (duration.weeks) {
		parts.push(`${duration.weeks} week${duration.weeks !== 1 ? 's' : ''}`)
	}
	if (duration.days) {
		parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`)
	}
	if (duration.hours) {
		parts.push(`${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`)
	}
	if (duration.minutes) {
		parts.push(`${duration.minutes} minute${duration.minutes !== 1 ? 's' : ''}`)
	}
	if (duration.seconds) {
		parts.push(`${duration.seconds} second${duration.seconds !== 1 ? 's' : ''}`)
	}

	return parts.length > 0 ? `every ${parts.join(', ')}` : 'no interval'
}
