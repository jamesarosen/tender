/**
 * Availability checker for validating LLM API credentials.
 *
 * Makes lightweight API calls to verify the API key is valid
 * and the service is reachable.
 */

import { z } from 'zod'

/**
 * Error codes for availability check failures.
 */
const availabilityErrorCodes = [
	'invalid-key',
	'rate-limited',
	'service-down',
] as const

export const availabilityErrorCodeSchema = z.enum(availabilityErrorCodes)

export type AvailabilityErrorCode = z.infer<typeof availabilityErrorCodeSchema>

/** Enum-like object for error codes */
export const AvailabilityErrorCodes = availabilityErrorCodeSchema.enum

/**
 * Structured error from availability check.
 */
export interface AvailabilityError {
	code: AvailabilityErrorCode
	statusCode?: number
	retryAfterMs?: number
	message: string
}

/**
 * Options for the availability checker.
 */
export interface CheckerOptions {
	/** API key to validate */
	apiKey: string
	/** Request timeout in milliseconds. Default: 10000 */
	timeoutMs?: number
	/** Base URL for the API. Default: https://api.anthropic.com */
	baseUrl?: string
	/** External abort signal (e.g., from XState actor). If provided, timeoutMs is ignored. */
	signal?: AbortSignal
}

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_BASE_URL = 'https://api.anthropic.com'

/**
 * Parses the Retry-After header value to milliseconds.
 * Supports both delay-seconds and HTTP-date formats.
 */
export function parseRetryAfter(value: string | null): number | undefined {
	if (!value) return undefined

	// Try parsing as seconds (most common for rate limits)
	// Retry-After: 0 means "retry immediately" per RFC 7231
	const seconds = parseInt(value, 10)
	if (!isNaN(seconds) && seconds >= 0) {
		return seconds * 1000
	}

	// Try parsing as HTTP-date
	const date = Date.parse(value)
	if (!isNaN(date)) {
		const delayMs = date - Date.now()
		return delayMs > 0 ? delayMs : undefined
	}

	return undefined
}

/**
 * Classifies an HTTP response into an availability error code.
 *
 * Classification logic:
 * - 401, 403 → `invalid-key` (credential issue)
 * - Any status with Retry-After header → `rate-limited` (server knows when to retry)
 * - Everything else (5xx, 529, etc.) → `service-down` (use exponential backoff)
 *
 * This is Retry-After-driven rather than status-code-driven, because:
 * - 429 (user rate limit) and 529 (server overload) both benefit from Retry-After
 * - If the server tells us when to retry, we should trust it
 * - If not, exponential backoff is the safe choice
 */
export function classifyResponse(
	status: number,
	hasRetryAfter: boolean
): AvailabilityErrorCode {
	if (status === 401 || status === 403) {
		return AvailabilityErrorCodes['invalid-key']
	}
	if (hasRetryAfter) {
		return AvailabilityErrorCodes['rate-limited']
	}
	// 5xx, 429/529 without Retry-After, and anything else unexpected
	return AvailabilityErrorCodes['service-down']
}

/**
 * Creates an AvailabilityError from an HTTP response.
 */
export function createErrorFromResponse(
	status: number,
	statusText: string,
	retryAfter: string | null
): AvailabilityError {
	const retryAfterMs = parseRetryAfter(retryAfter)
	const code = classifyResponse(status, retryAfterMs !== undefined)

	let message: string
	switch (code) {
		case AvailabilityErrorCodes['invalid-key']:
			message = `API key is invalid or unauthorized (${status} ${statusText})`
			break
		case AvailabilityErrorCodes['rate-limited']:
			message = `Rate limited. Retry after ${Math.ceil(retryAfterMs! / 1000)} seconds`
			break
		case AvailabilityErrorCodes['service-down']:
			message = `Service unavailable (${status} ${statusText})`
			break
	}

	return {
		code,
		statusCode: status,
		retryAfterMs,
		message,
	}
}

/**
 * Creates an AvailabilityError from a network or timeout error.
 */
export function createErrorFromException(error: unknown): AvailabilityError {
	const message =
		error instanceof Error ? error.message : 'Unknown error occurred'

	// Check for timeout errors
	if (error instanceof Error && error.name === 'AbortError') {
		return {
			code: AvailabilityErrorCodes['service-down'],
			message: 'Request timed out',
		}
	}

	// Network errors, DNS failures, etc.
	return {
		code: AvailabilityErrorCodes['service-down'],
		message: `Network error: ${message}`,
	}
}

/**
 * Checks if the Anthropic API is available with the given credentials.
 *
 * Makes a lightweight request to the models endpoint to verify:
 * 1. The API key is valid
 * 2. The service is reachable
 *
 * @throws {AvailabilityError} If the check fails
 */
export async function checkAnthropicAvailability(
	options: CheckerOptions
): Promise<void> {
	const {
		apiKey,
		timeoutMs = DEFAULT_TIMEOUT_MS,
		baseUrl = DEFAULT_BASE_URL,
		signal: externalSignal,
	} = options

	// Use external signal if provided, otherwise create internal timeout
	let signal: AbortSignal
	let timeoutId: ReturnType<typeof setTimeout> | undefined

	if (externalSignal) {
		signal = externalSignal
	} else {
		const controller = new AbortController()
		signal = controller.signal
		timeoutId = setTimeout(() => controller.abort(), timeoutMs)
	}

	try {
		const response = await fetch(new URL('/v1/models', baseUrl), {
			method: 'GET',
			headers: {
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			signal,
		})

		if (!response.ok) {
			throw createErrorFromResponse(
				response.status,
				response.statusText,
				response.headers.get('retry-after')
			)
		}

		// Success - API is available and key is valid
	} catch (error) {
		if (isAvailabilityError(error)) {
			throw error
		}
		throw createErrorFromException(error)
	} finally {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId)
		}
	}
}

/**
 * Type guard for AvailabilityError.
 */
export function isAvailabilityError(
	error: unknown
): error is AvailabilityError {
	if (
		typeof error !== 'object' ||
		error === null ||
		!('code' in error) ||
		!('message' in error)
	) {
		return false
	}
	return availabilityErrorCodeSchema.safeParse((error as AvailabilityError).code)
		.success
}
