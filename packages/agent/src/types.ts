import type { Task } from '@tender/db'
import { z } from 'zod'

// -----------------------------------------------------------------------------
// Availability State Machine Types
// -----------------------------------------------------------------------------

/**
 * Reasons why the LLM might be unavailable.
 */
const unavailableReasons = ['no-api-key', 'api-error'] as const

export const unavailableReasonSchema = z.enum(unavailableReasons)

export type UnavailableReason = z.infer<typeof unavailableReasonSchema>

/** Enum-like object for unavailable reasons */
export const UnavailableReasons = unavailableReasonSchema.enum

/**
 * Status values for the simple availability state.
 */
const availabilityStatuses = [
	'unknown',
	'checking',
	'available',
	'unavailable',
] as const

export const availabilityStatusSchema = z.enum(availabilityStatuses)

export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>

/** Enum-like object for availability statuses */
export const AvailabilityStatuses = availabilityStatusSchema.enum

/**
 * Discriminated union representing LLM availability state.
 *
 * State transitions:
 * - unknown → checking (on check())
 * - checking → available (on success)
 * - checking → unavailable (on failure)
 * - unavailable → checking (on retry)
 * - available → checking (on periodic recheck)
 */
export type AvailabilityState =
	| { status: typeof AvailabilityStatuses.unknown }
	| { status: typeof AvailabilityStatuses.checking }
	| { status: typeof AvailabilityStatuses.available }
	| {
			status: typeof AvailabilityStatuses.unavailable
			reason: UnavailableReason
			since: Date
	  }

/**
 * Listener function for availability state changes.
 */
export type AvailabilityListener = (state: AvailabilityState) => void

/**
 * Unsubscribe function returned by subscribe().
 */
export type Unsubscribe = () => void

/**
 * Function that checks if the LLM is reachable.
 * Returns true if available, throws on error.
 */
export type AvailabilityChecker = () => Promise<boolean>

/**
 * Configuration for the availability manager.
 */
export interface AvailabilityConfig {
	/** Number of retries before marking as unavailable. Default: 3 */
	retryCount: number
	/** Interval between reconnection attempts in ms. Default: 1800000 (30 min) */
	reconnectIntervalMs: number
	/** API key for the LLM provider. If undefined, will be permanently unavailable. */
	apiKey: string | undefined
}

// -----------------------------------------------------------------------------
// Prioritization Strategy Types
// -----------------------------------------------------------------------------

/**
 * A strategy for ranking tasks by priority.
 */
export interface PrioritizationStrategy {
	/** Unique name for this strategy */
	name: string
	/** Ranks tasks, returning a new sorted array (does not mutate input) */
	rank(tasks: Task[]): Task[]
}

/**
 * Input for creating a prioritization context.
 */
export interface PrioritizationContext {
	/** Current date/time for relative comparisons */
	now: Date
}
