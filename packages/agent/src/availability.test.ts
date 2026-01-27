import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAvailabilityManager } from './availability.js'
import type { AvailabilityConfig, AvailabilityState } from './types.js'

describe('AvailabilityManager', () => {
	const defaultConfig: AvailabilityConfig = {
		apiKey: 'test-api-key',
		retryCount: 3,
		reconnectIntervalMs: 1000,
	}

	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe('initial state', () => {
		it('starts in unknown state', () => {
			const manager = createAvailabilityManager(defaultConfig, async () => true)
			expect(manager.getState()).toEqual({ status: 'unknown' })
		})

		it('isAvailable returns false in unknown state', () => {
			const manager = createAvailabilityManager(defaultConfig, async () => true)
			expect(manager.isAvailable()).toBe(false)
		})
	})

	describe('check()', () => {
		it('transitions to available on successful check', async () => {
			const checker = vi.fn().mockResolvedValue(true)
			const manager = createAvailabilityManager(defaultConfig, checker)

			await manager.check()

			expect(manager.getState()).toEqual({ status: 'available' })
			expect(manager.isAvailable()).toBe(true)
		})

		it('transitions to unavailable after retryCount failures', async () => {
			const checker = vi.fn().mockRejectedValue(new Error('API error'))
			const manager = createAvailabilityManager(defaultConfig, checker)

			await manager.check()

			const state = manager.getState()
			expect(state.status).toBe('unavailable')
			if (state.status === 'unavailable') {
				expect(state.reason).toBe('api-error')
			}
			// Should have retried retryCount times
			expect(checker).toHaveBeenCalledTimes(defaultConfig.retryCount)
		})

		it('transitions to unavailable immediately with no API key', async () => {
			const checker = vi.fn().mockResolvedValue(true)
			const manager = createAvailabilityManager(
				{ ...defaultConfig, apiKey: undefined },
				checker
			)

			await manager.check()

			const state = manager.getState()
			expect(state.status).toBe('unavailable')
			if (state.status === 'unavailable') {
				expect(state.reason).toBe('no-api-key')
			}
			// Checker should not be called when no API key
			expect(checker).not.toHaveBeenCalled()
		})

		it('passes through checking state', async () => {
			const states: AvailabilityState[] = []
			const checker = vi.fn().mockResolvedValue(true)
			const manager = createAvailabilityManager(defaultConfig, checker)

			manager.subscribe((state) => states.push(state))

			await manager.check()

			expect(states).toContainEqual({ status: 'checking' })
		})
	})

	describe('subscribe()', () => {
		it('notifies listeners on state change', async () => {
			const listener = vi.fn()
			const checker = vi.fn().mockResolvedValue(true)
			const manager = createAvailabilityManager(defaultConfig, checker)

			manager.subscribe(listener)
			await manager.check()

			expect(listener).toHaveBeenCalledWith({ status: 'checking' })
			expect(listener).toHaveBeenCalledWith({ status: 'available' })
		})

		it('returns unsubscribe function', async () => {
			const listener = vi.fn()
			const checker = vi.fn().mockResolvedValue(true)
			const manager = createAvailabilityManager(defaultConfig, checker)

			const unsubscribe = manager.subscribe(listener)
			unsubscribe()

			await manager.check()

			expect(listener).not.toHaveBeenCalled()
		})
	})

	describe('scheduleRetry()', () => {
		it('schedules retry after configured interval', async () => {
			const checker = vi.fn().mockRejectedValue(new Error('API error'))
			const manager = createAvailabilityManager(defaultConfig, checker)

			await manager.check()
			expect(manager.getState().status).toBe('unavailable')

			// Reset mock to track retry call
			checker.mockClear()
			checker.mockResolvedValue(true)

			// Advance time to trigger retry
			await vi.advanceTimersByTimeAsync(defaultConfig.reconnectIntervalMs)

			expect(checker).toHaveBeenCalled()
		})

		it('does not schedule retry when no API key', async () => {
			const checker = vi.fn().mockResolvedValue(true)
			const manager = createAvailabilityManager(
				{ ...defaultConfig, apiKey: undefined },
				checker
			)

			await manager.check()

			// Advance time
			await vi.advanceTimersByTimeAsync(defaultConfig.reconnectIntervalMs * 2)

			// Should not have been called at all (no API key = no point retrying)
			expect(checker).not.toHaveBeenCalled()
		})
	})

	describe('dispose()', () => {
		it('cancels scheduled retry', async () => {
			const checker = vi.fn().mockRejectedValue(new Error('API error'))
			const manager = createAvailabilityManager(defaultConfig, checker)

			await manager.check()
			checker.mockClear()

			manager.dispose()

			// Advance time past retry interval
			await vi.advanceTimersByTimeAsync(defaultConfig.reconnectIntervalMs * 2)

			expect(checker).not.toHaveBeenCalled()
		})

		it('clears listeners', async () => {
			const listener = vi.fn()
			const checker = vi.fn().mockResolvedValue(true)
			const manager = createAvailabilityManager(defaultConfig, checker)

			manager.subscribe(listener)
			manager.dispose()

			await manager.check()

			expect(listener).not.toHaveBeenCalled()
		})
	})
})
