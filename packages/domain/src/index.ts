export {
	Recurrence,
	IntervalRecurrence,
	RRuleRecurrence,
	type RecurrenceJSON,
} from './recurrence.js'

// Re-export the Recurrence interface type separately for type-only imports
export type { Recurrence as RecurrenceInstance } from './recurrence.js'

// Signal recording and retrieval
export {
	recordSignal,
	deleteSignal,
	getSignalsForTask,
	getSignalsByKind,
	countDeferrals,
	getLatestDeferralTimestamps,
	type RecordSignalInput,
	type RecordSignalOptions,
} from './signals.js'

// Tag and URL extraction
export { extractTags, parseTagSegments, type TagSegment } from './tags.js'
