export {
	Recurrence,
	IntervalRecurrence,
	RRuleRecurrence,
	type RecurrenceJSON,
} from './recurrence.js'

// Re-export the Recurrence interface type separately for type-only imports
export type { Recurrence as RecurrenceInstance } from './recurrence.js'
