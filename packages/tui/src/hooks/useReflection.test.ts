import { describe, it, expect } from 'vitest'
import { shouldShowReflection, getReflectionPrompt } from './useReflection.js'
import type { TaskStats } from './useTasks.js'

describe('shouldShowReflection', () => {
	describe('completion trigger', () => {
		it('always shows for breakthrough completions (2+ deferrals)', () => {
			const stats: TaskStats = { deferralCount: 2, daysSinceCreated: 1 }
			expect(shouldShowReflection('completion', stats)).toBe(true)
		})

		it('always shows for highly deferred tasks (3+ deferrals)', () => {
			const stats: TaskStats = { deferralCount: 3, daysSinceCreated: 1 }
			expect(shouldShowReflection('completion', stats)).toBe(true)
		})
	})

	describe('deferral trigger', () => {
		it('does not show on first deferral', () => {
			const stats: TaskStats = { deferralCount: 0, daysSinceCreated: 1 }
			expect(shouldShowReflection('deferral', stats)).toBe(false)
		})

		it('shows on second deferral', () => {
			const stats: TaskStats = { deferralCount: 1, daysSinceCreated: 1 }
			expect(shouldShowReflection('deferral', stats)).toBe(true)
		})

		it('shows on subsequent deferrals', () => {
			const stats: TaskStats = { deferralCount: 5, daysSinceCreated: 1 }
			expect(shouldShowReflection('deferral', stats)).toBe(true)
		})
	})

	describe('lingering trigger', () => {
		it('does not show for recent tasks', () => {
			const stats: TaskStats = { deferralCount: 0, daysSinceCreated: 3 }
			expect(shouldShowReflection('lingering', stats)).toBe(false)
		})

		it('shows for tasks 5+ days old', () => {
			const stats: TaskStats = { deferralCount: 0, daysSinceCreated: 5 }
			expect(shouldShowReflection('lingering', stats)).toBe(true)
		})
	})
})

describe('getReflectionPrompt', () => {
	it('returns completion prompt for completion trigger', () => {
		const prompt = getReflectionPrompt('completion')
		expect(prompt.trigger).toBe('completion')
		expect(typeof prompt.question).toBe('string')
		expect(prompt.question.length).toBeGreaterThan(0)
	})

	it('returns deferral prompt for deferral trigger', () => {
		const prompt = getReflectionPrompt('deferral')
		expect(prompt.trigger).toBe('deferral')
		expect(typeof prompt.question).toBe('string')
	})

	it('returns lingering prompt for lingering trigger', () => {
		const prompt = getReflectionPrompt('lingering')
		expect(prompt.trigger).toBe('lingering')
		expect(typeof prompt.question).toBe('string')
	})
})
