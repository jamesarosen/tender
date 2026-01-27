import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createActor, waitFor } from 'xstate'
import {
	llmAvailabilityMachine,
	type LlmAvailabilityInput,
} from './llm-availability-machine.js'

// Mock the availability checker
vi.mock('./availability-checker.js', () => ({
	checkAnthropicAvailability: vi.fn(),
	isAvailabilityError: (error: unknown): boolean =>
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		'message' in error,
}))

import { checkAnthropicAvailability } from './availability-checker.js'

const mockCheck = vi.mocked(checkAnthropicAvailability)

function createTestActor(input: Partial<LlmAvailabilityInput> = {}) {
	return createActor(llmAvailabilityMachine, {
		input: {
			provider: 'anthropic',
			apiKey: 'test-key',
			maxRetries: 3,
			baseBackoffMs: 100,
			maxBackoffMs: 1000,
			rateLimitDefaultMs: 100,
			...input,
		},
	})
}

describe('llmAvailabilityMachine', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		mockCheck.mockReset()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe('initial state routing', () => {
		it('transitions to disabled when provider is none', async () => {
			const actor = createTestActor({ provider: 'none' })
			actor.start()

			// Should immediately transition to disabled
			expect(actor.getSnapshot().value).toBe('disabled')
			actor.stop()
		})

		it('transitions to keyMissing when no API key', async () => {
			const actor = createTestActor({ apiKey: undefined })
			actor.start()

			expect(actor.getSnapshot().value).toBe('keyMissing')
			actor.stop()
		})

		it('transitions to checking when provider and key are set', async () => {
			mockCheck.mockImplementation(() => new Promise(() => {})) // Never resolves
			const actor = createTestActor()
			actor.start()

			expect(actor.getSnapshot().value).toBe('checking')
			actor.stop()
		})
	})

	describe('checking state', () => {
		it('transitions to available on success', async () => {
			mockCheck.mockResolvedValue(undefined)
			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'available')
			expect(actor.getSnapshot().value).toBe('available')
			actor.stop()
		})

		it('transitions to invalidKey on 401/403', async () => {
			mockCheck.mockRejectedValue({
				code: 'invalid-key',
				statusCode: 401,
				message: 'Invalid API key',
			})

			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'invalidKey')
			expect(actor.getSnapshot().value).toBe('invalidKey')
			expect(actor.getSnapshot().context.lastErrorMessage).toBe('Invalid API key')
			expect(actor.getSnapshot().context.lastErrorCode).toBe(401)
			actor.stop()
		})

		it('transitions to rateLimited on 429', async () => {
			mockCheck.mockRejectedValue({
				code: 'rate-limited',
				statusCode: 429,
				retryAfterMs: 5000,
				message: 'Rate limited',
			})

			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'rateLimited')
			expect(actor.getSnapshot().value).toBe('rateLimited')
			expect(actor.getSnapshot().context.retryAfterMs).toBe(5000)
			actor.stop()
		})

		it('transitions to serviceDown on 5xx', async () => {
			mockCheck.mockRejectedValue({
				code: 'service-down',
				statusCode: 500,
				message: 'Internal server error',
			})

			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'serviceDown')
			expect(actor.getSnapshot().value).toBe('serviceDown')
			expect(actor.getSnapshot().context.retryCount).toBe(1)
			actor.stop()
		})
	})

	describe('available state', () => {
		it('allows manual CHECK', async () => {
			mockCheck.mockResolvedValue(undefined)
			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'available')

			// Now make check fail
			mockCheck.mockRejectedValue({
				code: 'service-down',
				message: 'Down',
			})

			actor.send({ type: 'CHECK' })
			await waitFor(actor, (state) => state.value === 'serviceDown')

			expect(actor.getSnapshot().value).toBe('serviceDown')
			actor.stop()
		})

		it('handles CONFIGURE event', async () => {
			mockCheck.mockResolvedValue(undefined)
			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'available')

			actor.send({ type: 'CONFIGURE', provider: 'none' })

			expect(actor.getSnapshot().value).toBe('disabled')
			expect(actor.getSnapshot().context.provider).toBe('none')
			actor.stop()
		})
	})

	describe('keyMissing state', () => {
		it('transitions to checking when key is added via CONFIGURE', async () => {
			mockCheck.mockImplementation(() => new Promise(() => {}))
			const actor = createTestActor({ apiKey: undefined })
			actor.start()

			expect(actor.getSnapshot().value).toBe('keyMissing')

			actor.send({ type: 'CONFIGURE', provider: 'anthropic', apiKey: 'new-key' })

			expect(actor.getSnapshot().value).toBe('checking')
			expect(actor.getSnapshot().context.apiKey).toBe('new-key')
			actor.stop()
		})
	})

	describe('invalidKey state', () => {
		it('does not auto-retry', async () => {
			mockCheck.mockRejectedValue({
				code: 'invalid-key',
				statusCode: 401,
				message: 'Bad key',
			})

			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'invalidKey')

			// Advance time - should stay in invalidKey
			await vi.advanceTimersByTimeAsync(10_000)
			expect(actor.getSnapshot().value).toBe('invalidKey')
			actor.stop()
		})

		it('allows manual CHECK', async () => {
			mockCheck
				.mockRejectedValueOnce({
					code: 'invalid-key',
					statusCode: 401,
					message: 'Bad key',
				})
				.mockResolvedValueOnce(undefined)

			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'invalidKey')

			actor.send({ type: 'CHECK' })
			await waitFor(actor, (state) => state.value === 'available')

			expect(actor.getSnapshot().value).toBe('available')
			actor.stop()
		})
	})

	describe('rateLimited state', () => {
		it('auto-retries after retryAfterMs', async () => {
			mockCheck
				.mockRejectedValueOnce({
					code: 'rate-limited',
					statusCode: 429,
					retryAfterMs: 500,
					message: 'Rate limited',
				})
				.mockResolvedValueOnce(undefined)

			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'rateLimited')

			// Advance past the retry delay
			await vi.advanceTimersByTimeAsync(500)

			await waitFor(actor, (state) => state.value === 'available')
			expect(actor.getSnapshot().value).toBe('available')
			actor.stop()
		})

		it('uses rateLimitDefaultMs when no retryAfterMs', async () => {
			mockCheck
				.mockRejectedValueOnce({
					code: 'rate-limited',
					statusCode: 429,
					message: 'Rate limited',
				})
				.mockResolvedValueOnce(undefined)

			const actor = createTestActor({ rateLimitDefaultMs: 200 })
			actor.start()

			await waitFor(actor, (state) => state.value === 'rateLimited')

			// Should still be rateLimited before default delay
			await vi.advanceTimersByTimeAsync(100)
			expect(actor.getSnapshot().value).toBe('rateLimited')

			// Should retry after default delay
			await vi.advanceTimersByTimeAsync(100)
			await waitFor(actor, (state) => state.value === 'available')
			actor.stop()
		})
	})

	describe('serviceDown state', () => {
		it('auto-retries with exponential backoff', async () => {
			mockCheck
				.mockRejectedValueOnce({ code: 'service-down', message: 'Down 1' })
				.mockRejectedValueOnce({ code: 'service-down', message: 'Down 2' })
				.mockResolvedValueOnce(undefined)

			const actor = createTestActor({ baseBackoffMs: 100 })
			actor.start()

			await waitFor(actor, (state) => state.value === 'serviceDown')
			expect(actor.getSnapshot().context.retryCount).toBe(1)
			expect(actor.getSnapshot().context.currentBackoffMs).toBe(100)

			// First retry after 100ms
			await vi.advanceTimersByTimeAsync(100)
			await waitFor(actor, (state) => state.value === 'serviceDown')
			expect(actor.getSnapshot().context.retryCount).toBe(2)
			expect(actor.getSnapshot().context.currentBackoffMs).toBe(200) // Doubled

			// Second retry after 200ms
			await vi.advanceTimersByTimeAsync(200)
			await waitFor(actor, (state) => state.value === 'available')
			actor.stop()
		})

		it('stops retrying after maxRetries', async () => {
			mockCheck.mockRejectedValue({
				code: 'service-down',
				message: 'Down',
			})

			const actor = createTestActor({ maxRetries: 2, baseBackoffMs: 100 })
			actor.start()

			// Initial check fails, retryCount = 1
			await waitFor(actor, (state) => state.value === 'serviceDown')
			expect(actor.getSnapshot().context.retryCount).toBe(1)

			// First retry fails, retryCount = 2
			await vi.advanceTimersByTimeAsync(100)
			await waitFor(
				actor,
				(state) => state.value === 'serviceDown' && state.context.retryCount === 2
			)

			// Should not auto-retry anymore (retryCount >= maxRetries)
			await vi.advanceTimersByTimeAsync(10_000)
			expect(actor.getSnapshot().value).toBe('serviceDown')
			expect(actor.getSnapshot().context.retryCount).toBe(2)
			actor.stop()
		})

		it('resets retry state on manual CHECK', async () => {
			mockCheck
				.mockRejectedValueOnce({ code: 'service-down', message: 'Down' })
				.mockResolvedValueOnce(undefined)

			const actor = createTestActor()
			actor.start()

			await waitFor(actor, (state) => state.value === 'serviceDown')
			expect(actor.getSnapshot().context.retryCount).toBe(1)

			actor.send({ type: 'CHECK' })
			await waitFor(actor, (state) => state.value === 'available')

			expect(actor.getSnapshot().context.retryCount).toBe(0)
			actor.stop()
		})

		it('caps backoff at maxBackoffMs', async () => {
			mockCheck.mockRejectedValue({ code: 'service-down', message: 'Down' })

			const actor = createTestActor({
				baseBackoffMs: 100,
				maxBackoffMs: 300,
				maxRetries: 10,
			})
			actor.start()

			await waitFor(actor, (state) => state.value === 'serviceDown')

			// First backoff: 100ms
			await vi.advanceTimersByTimeAsync(100)
			await waitFor(actor, (state) => state.context.retryCount === 2)
			expect(actor.getSnapshot().context.currentBackoffMs).toBe(200)

			// Second backoff: 200ms
			await vi.advanceTimersByTimeAsync(200)
			await waitFor(actor, (state) => state.context.retryCount === 3)
			expect(actor.getSnapshot().context.currentBackoffMs).toBe(300) // Capped

			// Third backoff: should still be 300ms (capped)
			await vi.advanceTimersByTimeAsync(300)
			await waitFor(actor, (state) => state.context.retryCount === 4)
			expect(actor.getSnapshot().context.currentBackoffMs).toBe(300) // Still capped

			actor.stop()
		})
	})

	describe('disabled state', () => {
		it('transitions to checking when reconfigured with provider', async () => {
			mockCheck.mockImplementation(() => new Promise(() => {}))
			const actor = createTestActor({ provider: 'none' })
			actor.start()

			expect(actor.getSnapshot().value).toBe('disabled')

			actor.send({
				type: 'CONFIGURE',
				provider: 'anthropic',
				apiKey: 'new-key',
			})

			expect(actor.getSnapshot().value).toBe('checking')
			actor.stop()
		})
	})

	describe('context initialization', () => {
		it('uses provided config values', () => {
			const actor = createTestActor({
				provider: 'anthropic',
				apiKey: 'my-key',
				maxRetries: 10,
				baseBackoffMs: 5000,
				maxBackoffMs: 300_000,
				rateLimitDefaultMs: 30_000,
			})
			actor.start()

			const ctx = actor.getSnapshot().context
			expect(ctx.provider).toBe('anthropic')
			expect(ctx.apiKey).toBe('my-key')
			expect(ctx.maxRetries).toBe(10)
			expect(ctx.baseBackoffMs).toBe(5000)
			expect(ctx.maxBackoffMs).toBe(300_000)
			expect(ctx.rateLimitDefaultMs).toBe(30_000)
			actor.stop()
		})

		it('initializes retry state to defaults', () => {
			mockCheck.mockImplementation(() => new Promise(() => {}))
			const actor = createTestActor()
			actor.start()

			const ctx = actor.getSnapshot().context
			expect(ctx.retryCount).toBe(0)
			expect(ctx.retryAfterMs).toBeNull()
			expect(ctx.currentBackoffMs).toBe(100) // baseBackoffMs from test
			expect(ctx.lastErrorMessage).toBeNull()
			expect(ctx.lastErrorCode).toBeNull()
			actor.stop()
		})
	})
})
