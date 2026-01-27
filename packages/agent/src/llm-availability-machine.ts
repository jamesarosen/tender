/**
 * XState state machine for LLM availability management.
 *
 * Handles different failure modes with appropriate retry strategies:
 * - invalid-key: No auto-retry (user must fix)
 * - rate-limited: Auto-retry after Retry-After delay
 * - service-down: Auto-retry with exponential backoff
 */

import { setup, assign, fromPromise } from 'xstate'
import { z } from 'zod'
import type { LlmProvider } from '@tender/config'
import {
	checkAnthropicAvailability,
	type AvailabilityError,
	isAvailabilityError,
} from './availability-checker.js'

/**
 * State values for the LLM availability state machine.
 */
const llmAvailabilityStates = [
	'initializing',
	'disabled',
	'checking',
	'available',
	'keyMissing',
	'invalidKey',
	'rateLimited',
	'serviceDown',
] as const

export const llmAvailabilityStateSchema = z.enum(llmAvailabilityStates)

export type LlmAvailabilityStateValue = z.infer<
	typeof llmAvailabilityStateSchema
>

/** Enum-like object for state values */
export const LlmAvailabilityStates = llmAvailabilityStateSchema.enum

/**
 * Context for the LLM availability state machine.
 */
export interface LlmAvailabilityContext {
	// Current configuration
	provider: LlmProvider
	apiKey: string | undefined

	// Retry state
	retryCount: number
	retryAfterMs: number | null
	currentBackoffMs: number

	// Configuration (injected at creation)
	maxRetries: number
	baseBackoffMs: number
	maxBackoffMs: number
	rateLimitDefaultMs: number

	// Error info for UI
	lastErrorMessage: string | null
	lastErrorCode: number | null
}

/**
 * Events for the LLM availability state machine.
 */
export type LlmAvailabilityEvent =
	| { type: 'CHECK' }
	| { type: 'CONFIGURE'; provider: LlmProvider; apiKey?: string }

/**
 * Input for creating the state machine.
 */
export interface LlmAvailabilityInput {
	provider: LlmProvider
	apiKey: string | undefined
	maxRetries?: number
	baseBackoffMs?: number
	maxBackoffMs?: number
	rateLimitDefaultMs?: number
}

/**
 * Default configuration values.
 */
const DEFAULTS = {
	maxRetries: 5,
	baseBackoffMs: 10_000,
	maxBackoffMs: 600_000,
	rateLimitDefaultMs: 60_000,
} as const

/**
 * Creates initial context from input.
 */
function createInitialContext(
	input: LlmAvailabilityInput
): LlmAvailabilityContext {
	return {
		provider: input.provider,
		apiKey: input.apiKey,
		retryCount: 0,
		retryAfterMs: null,
		currentBackoffMs: input.baseBackoffMs ?? DEFAULTS.baseBackoffMs,
		maxRetries: input.maxRetries ?? DEFAULTS.maxRetries,
		baseBackoffMs: input.baseBackoffMs ?? DEFAULTS.baseBackoffMs,
		maxBackoffMs: input.maxBackoffMs ?? DEFAULTS.maxBackoffMs,
		rateLimitDefaultMs: input.rateLimitDefaultMs ?? DEFAULTS.rateLimitDefaultMs,
		lastErrorMessage: null,
		lastErrorCode: null,
	}
}

/**
 * The LLM availability state machine.
 */
export const llmAvailabilityMachine = setup({
	types: {
		context: {} as LlmAvailabilityContext,
		events: {} as LlmAvailabilityEvent,
		input: {} as LlmAvailabilityInput,
	},

	actors: {
		checkAvailability: fromPromise<void, { apiKey: string }>(
			async ({ input, signal }) => {
				await checkAnthropicAvailability({ apiKey: input.apiKey, signal })
			}
		),
	},

	guards: {
		isDisabled: ({ context }) => context.provider === 'none',
		hasNoKey: ({ context }) => !context.apiKey,
		canRetry: ({ context }) => context.retryCount < context.maxRetries,
		isInvalidKeyError: (_, params: { error: unknown }) =>
			isAvailabilityError(params.error) && params.error.code === 'invalid-key',
		isRateLimitError: (_, params: { error: unknown }) =>
			isAvailabilityError(params.error) && params.error.code === 'rate-limited',
	},

	actions: {
		resetRetryState: assign({
			retryCount: 0,
			currentBackoffMs: ({ context }) => context.baseBackoffMs,
			retryAfterMs: null,
			lastErrorMessage: null,
			lastErrorCode: null,
		}),

		incrementRetry: assign({
			retryCount: ({ context }) => context.retryCount + 1,
		}),

		calculateBackoff: assign({
			currentBackoffMs: ({ context }) =>
				Math.min(context.currentBackoffMs * 2, context.maxBackoffMs),
		}),

		setRateLimitError: assign(({ event }) => {
			const error = (event as unknown as { error: AvailabilityError }).error
			return {
				retryAfterMs: error.retryAfterMs ?? null,
				lastErrorMessage: error.message,
				lastErrorCode: error.statusCode ?? null,
			}
		}),

		setError: assign(({ event }) => {
			const error = (event as unknown as { error: AvailabilityError }).error
			return {
				lastErrorMessage: error.message,
				lastErrorCode: error.statusCode ?? null,
			}
		}),

		updateConfig: assign(({ event }) => {
			const e = event as unknown as {
				type: 'CONFIGURE'
				provider: LlmProvider
				apiKey?: string
			}
			return {
				provider: e.provider,
				apiKey: e.apiKey,
			}
		}),
	},

	delays: {
		RATE_LIMIT_DELAY: ({ context }) =>
			context.retryAfterMs ?? context.rateLimitDefaultMs,
		BACKOFF_DELAY: ({ context }) => context.currentBackoffMs,
	},
}).createMachine({
	id: 'llmAvailability',
	initial: 'initializing',
	context: ({ input }) => createInitialContext(input),

	states: {
		/**
		 * Transient state that routes to the appropriate initial state
		 * based on configuration.
		 */
		initializing: {
			always: [
				{ guard: 'isDisabled', target: 'disabled' },
				{ guard: 'hasNoKey', target: 'keyMissing' },
				{ target: 'checking' },
			],
		},

		/**
		 * User has explicitly disabled LLM features.
		 */
		disabled: {
			on: {
				CONFIGURE: {
					target: 'initializing',
					actions: 'updateConfig',
				},
			},
		},

		/**
		 * Actively checking API availability.
		 */
		checking: {
			invoke: {
				src: 'checkAvailability',
				input: ({ context }) => ({ apiKey: context.apiKey! }),
				onDone: {
					target: 'available',
					actions: 'resetRetryState',
				},
				onError: [
					{
						guard: {
							type: 'isInvalidKeyError',
							params: ({ event }) => ({ error: event.error }),
						},
						target: 'invalidKey',
						actions: {
							type: 'setError',
							params: ({ event }) => ({ error: event.error }),
						},
					},
					{
						guard: {
							type: 'isRateLimitError',
							params: ({ event }) => ({ error: event.error }),
						},
						target: 'rateLimited',
						actions: {
							type: 'setRateLimitError',
							params: ({ event }) => ({ error: event.error }),
						},
					},
					{
						target: 'serviceDown',
						actions: [
							{ type: 'setError', params: ({ event }) => ({ error: event.error }) },
							'incrementRetry',
						],
					},
				],
			},
		},

		/**
		 * LLM is available and working.
		 */
		available: {
			on: {
				CHECK: 'checking',
				CONFIGURE: {
					target: 'initializing',
					actions: 'updateConfig',
				},
			},
		},

		/**
		 * No API key configured for the selected provider.
		 */
		keyMissing: {
			on: {
				CONFIGURE: {
					target: 'initializing',
					actions: 'updateConfig',
				},
			},
		},

		/**
		 * API key is invalid (401/403).
		 * No auto-retry - user must fix the key.
		 */
		invalidKey: {
			on: {
				CHECK: 'checking',
				CONFIGURE: {
					target: 'initializing',
					actions: 'updateConfig',
				},
			},
		},

		/**
		 * Rate limited (429).
		 * Auto-retries after the Retry-After delay.
		 */
		rateLimited: {
			after: {
				RATE_LIMIT_DELAY: 'checking',
			},
			on: {
				CHECK: 'checking',
				CONFIGURE: {
					target: 'initializing',
					actions: 'updateConfig',
				},
			},
		},

		/**
		 * Service is down (5xx/timeout/network error).
		 * Auto-retries with exponential backoff up to maxRetries.
		 */
		serviceDown: {
			after: {
				BACKOFF_DELAY: {
					guard: 'canRetry',
					target: 'checking',
					actions: 'calculateBackoff',
				},
			},
			on: {
				CHECK: {
					target: 'checking',
					actions: 'resetRetryState',
				},
				CONFIGURE: {
					target: 'initializing',
					actions: 'updateConfig',
				},
			},
		},
	},
})
