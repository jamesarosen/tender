import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	parseRetryAfter,
	classifyResponse,
	createErrorFromResponse,
	createErrorFromException,
	checkAnthropicAvailability,
	isAvailabilityError,
	type AvailabilityError,
} from './availability-checker.js'

describe('parseRetryAfter', () => {
	it('returns undefined for null', () => {
		expect(parseRetryAfter(null)).toBeUndefined()
	})

	it('returns undefined for empty string', () => {
		expect(parseRetryAfter('')).toBeUndefined()
	})

	it('parses seconds as milliseconds', () => {
		expect(parseRetryAfter('60')).toBe(60_000)
		expect(parseRetryAfter('1')).toBe(1_000)
		expect(parseRetryAfter('300')).toBe(300_000)
	})

	it('returns 0 for zero seconds (retry immediately)', () => {
		expect(parseRetryAfter('0')).toBe(0)
	})

	it('returns undefined for negative seconds', () => {
		expect(parseRetryAfter('-10')).toBeUndefined()
	})

	it('parses HTTP-date format', () => {
		const futureDate = new Date(Date.now() + 30_000).toUTCString()
		const result = parseRetryAfter(futureDate)
		expect(result).toBeDefined()
		expect(result).toBeGreaterThan(25_000)
		expect(result).toBeLessThan(35_000)
	})

	it('returns undefined for past HTTP-date', () => {
		const pastDate = new Date(Date.now() - 10_000).toUTCString()
		expect(parseRetryAfter(pastDate)).toBeUndefined()
	})

	it('returns undefined for invalid string', () => {
		expect(parseRetryAfter('not-a-number')).toBeUndefined()
	})
})

describe('classifyResponse', () => {
	it('classifies 401 as invalid-key regardless of Retry-After', () => {
		expect(classifyResponse(401, false)).toBe('invalid-key')
		expect(classifyResponse(401, true)).toBe('invalid-key')
	})

	it('classifies 403 as invalid-key regardless of Retry-After', () => {
		expect(classifyResponse(403, false)).toBe('invalid-key')
		expect(classifyResponse(403, true)).toBe('invalid-key')
	})

	it('classifies 429 with Retry-After as rate-limited', () => {
		expect(classifyResponse(429, true)).toBe('rate-limited')
	})

	it('classifies 429 without Retry-After as service-down', () => {
		expect(classifyResponse(429, false)).toBe('service-down')
	})

	it('classifies 529 with Retry-After as rate-limited', () => {
		expect(classifyResponse(529, true)).toBe('rate-limited')
	})

	it('classifies 529 without Retry-After as service-down', () => {
		expect(classifyResponse(529, false)).toBe('service-down')
	})

	it('classifies 5xx with Retry-After as rate-limited', () => {
		expect(classifyResponse(500, true)).toBe('rate-limited')
		expect(classifyResponse(502, true)).toBe('rate-limited')
		expect(classifyResponse(503, true)).toBe('rate-limited')
	})

	it('classifies 5xx without Retry-After as service-down', () => {
		expect(classifyResponse(500, false)).toBe('service-down')
		expect(classifyResponse(502, false)).toBe('service-down')
		expect(classifyResponse(503, false)).toBe('service-down')
		expect(classifyResponse(504, false)).toBe('service-down')
	})

	it('classifies other status codes based on Retry-After', () => {
		expect(classifyResponse(400, false)).toBe('service-down')
		expect(classifyResponse(404, false)).toBe('service-down')
		expect(classifyResponse(400, true)).toBe('rate-limited')
	})
})

describe('createErrorFromResponse', () => {
	it('creates invalid-key error for 401', () => {
		const error = createErrorFromResponse(401, 'Unauthorized', null)
		expect(error.code).toBe('invalid-key')
		expect(error.statusCode).toBe(401)
		expect(error.message).toContain('invalid or unauthorized')
	})

	it('creates rate-limited error with retry-after', () => {
		const error = createErrorFromResponse(429, 'Too Many Requests', '60')
		expect(error.code).toBe('rate-limited')
		expect(error.statusCode).toBe(429)
		expect(error.retryAfterMs).toBe(60_000)
		expect(error.message).toContain('60 seconds')
	})

	it('creates service-down error for 429 without retry-after', () => {
		const error = createErrorFromResponse(429, 'Too Many Requests', null)
		expect(error.code).toBe('service-down')
		expect(error.retryAfterMs).toBeUndefined()
		expect(error.message).toContain('Service unavailable')
	})

	it('creates rate-limited error for 529 with retry-after', () => {
		const error = createErrorFromResponse(529, 'Overloaded', '30')
		expect(error.code).toBe('rate-limited')
		expect(error.statusCode).toBe(529)
		expect(error.retryAfterMs).toBe(30_000)
		expect(error.message).toContain('30 seconds')
	})

	it('creates service-down error for 529 without retry-after', () => {
		const error = createErrorFromResponse(529, 'Overloaded', null)
		expect(error.code).toBe('service-down')
		expect(error.statusCode).toBe(529)
		expect(error.message).toContain('Service unavailable')
	})

	it('creates service-down error for 500', () => {
		const error = createErrorFromResponse(500, 'Internal Server Error', null)
		expect(error.code).toBe('service-down')
		expect(error.statusCode).toBe(500)
		expect(error.message).toContain('Service unavailable')
	})
})

describe('createErrorFromException', () => {
	it('creates service-down error for AbortError', () => {
		const abortError = new Error('Aborted')
		abortError.name = 'AbortError'
		const error = createErrorFromException(abortError)
		expect(error.code).toBe('service-down')
		expect(error.message).toBe('Request timed out')
	})

	it('creates service-down error for network error', () => {
		const networkError = new Error('fetch failed')
		const error = createErrorFromException(networkError)
		expect(error.code).toBe('service-down')
		expect(error.message).toContain('Network error')
		expect(error.message).toContain('fetch failed')
	})

	it('handles non-Error objects', () => {
		const error = createErrorFromException('string error')
		expect(error.code).toBe('service-down')
		expect(error.message).toContain('Network error')
	})
})

describe('isAvailabilityError', () => {
	it('returns true for valid AvailabilityError', () => {
		const error: AvailabilityError = {
			code: 'invalid-key',
			message: 'test',
		}
		expect(isAvailabilityError(error)).toBe(true)
	})

	it('returns true for all error codes', () => {
		expect(isAvailabilityError({ code: 'invalid-key', message: 'test' })).toBe(
			true
		)
		expect(isAvailabilityError({ code: 'rate-limited', message: 'test' })).toBe(
			true
		)
		expect(isAvailabilityError({ code: 'service-down', message: 'test' })).toBe(
			true
		)
	})

	it('returns false for null', () => {
		expect(isAvailabilityError(null)).toBe(false)
	})

	it('returns false for undefined', () => {
		expect(isAvailabilityError(undefined)).toBe(false)
	})

	it('returns false for plain Error', () => {
		expect(isAvailabilityError(new Error('test'))).toBe(false)
	})

	it('returns false for object with invalid code', () => {
		expect(isAvailabilityError({ code: 'unknown', message: 'test' })).toBe(false)
	})

	it('returns false for object missing message', () => {
		expect(isAvailabilityError({ code: 'invalid-key' })).toBe(false)
	})
})

describe('checkAnthropicAvailability', () => {
	const originalFetch = global.fetch

	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		global.fetch = originalFetch
		vi.useRealTimers()
	})

	it('succeeds when API returns 200', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK',
		})

		await expect(
			checkAnthropicAvailability({ apiKey: 'test-key' })
		).resolves.toBeUndefined()

		expect(fetch).toHaveBeenCalledWith(
			expect.objectContaining({ href: 'https://api.anthropic.com/v1/models' }),
			expect.objectContaining({
				method: 'GET',
				headers: expect.objectContaining({
					'x-api-key': 'test-key',
					'anthropic-version': '2023-06-01',
				}),
			})
		)
	})

	it('throws invalid-key error for 401', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
			statusText: 'Unauthorized',
			headers: new Headers(),
		})

		await expect(
			checkAnthropicAvailability({ apiKey: 'bad-key' })
		).rejects.toMatchObject({
			code: 'invalid-key',
			statusCode: 401,
		})
	})

	it('throws invalid-key error for 403', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			statusText: 'Forbidden',
			headers: new Headers(),
		})

		await expect(
			checkAnthropicAvailability({ apiKey: 'bad-key' })
		).rejects.toMatchObject({
			code: 'invalid-key',
			statusCode: 403,
		})
	})

	it('throws rate-limited error for 429 with Retry-After', async () => {
		const headers = new Headers()
		headers.set('retry-after', '120')

		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 429,
			statusText: 'Too Many Requests',
			headers,
		})

		await expect(
			checkAnthropicAvailability({ apiKey: 'test-key' })
		).rejects.toMatchObject({
			code: 'rate-limited',
			statusCode: 429,
			retryAfterMs: 120_000,
		})
	})

	it('throws service-down error for 500', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
			headers: new Headers(),
		})

		await expect(
			checkAnthropicAvailability({ apiKey: 'test-key' })
		).rejects.toMatchObject({
			code: 'service-down',
			statusCode: 500,
		})
	})

	it('throws service-down error for network failure', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'))

		await expect(
			checkAnthropicAvailability({ apiKey: 'test-key' })
		).rejects.toMatchObject({
			code: 'service-down',
			message: expect.stringContaining('Network error'),
		})
	})

	it('throws service-down error on timeout', async () => {
		// Use real timers for this test with a very short timeout
		vi.useRealTimers()

		global.fetch = vi.fn().mockImplementation(
			(_url, options) =>
				new Promise((_, reject) => {
					const signal = options?.signal as AbortSignal | undefined
					if (signal) {
						signal.addEventListener('abort', () => {
							const error = new Error('Aborted')
							error.name = 'AbortError'
							reject(error)
						})
					}
				})
		)

		await expect(
			checkAnthropicAvailability({
				apiKey: 'test-key',
				timeoutMs: 10, // Very short timeout
			})
		).rejects.toMatchObject({
			code: 'service-down',
			message: 'Request timed out',
		})

		// Restore fake timers for other tests
		vi.useFakeTimers()
	})

	it('uses custom base URL', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
		})

		await checkAnthropicAvailability({
			apiKey: 'test-key',
			baseUrl: 'https://custom.api.com',
		})

		expect(fetch).toHaveBeenCalledWith(
			expect.objectContaining({ href: 'https://custom.api.com/v1/models' }),
			expect.any(Object)
		)
	})
})
