import { useState, useCallback } from 'react'
import type { TaskStats } from './useTasks.js'

export type ReflectionTrigger = 'completion' | 'deferral' | 'lingering'

export interface ReflectionPrompt {
	trigger: ReflectionTrigger
	question: string
}

const PROMPTS: Record<ReflectionTrigger, string[]> = {
	completion: ['How did that feel?', 'Any thoughts on what made this work?'],
	deferral: [
		"What's making this hard to start?",
		'Is there something blocking you?',
	],
	lingering: [
		'This keeps coming back. What would help?',
		"What's really going on with this one?",
	],
}

function randomFrom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Determines whether to show a reflection prompt and which one.
 *
 * Reflection rules:
 * - Completion: 20% of the time, or always if deferred 2+ times
 * - Deferral: On 2nd+ deferral
 * - Lingering: After shown 5+ times (surfaced signals)
 */
export function shouldShowReflection(
	trigger: ReflectionTrigger,
	stats: TaskStats
): boolean {
	switch (trigger) {
		case 'completion':
			// Always show if task was deferred 2+ times (breakthrough completion)
			if (stats.deferralCount >= 2) return true
			// Otherwise 20% chance
			return Math.random() < 0.2
		case 'deferral':
			// Show on 2nd+ deferral
			return stats.deferralCount >= 1 // Will be 2 after this deferral
		case 'lingering':
			// Would need surfaced count, using days as proxy for now
			return stats.daysSinceCreated >= 5
		default:
			return false
	}
}

export function getReflectionPrompt(
	trigger: ReflectionTrigger
): ReflectionPrompt {
	return {
		trigger,
		question: randomFrom(PROMPTS[trigger]),
	}
}

export interface UseReflectionResult {
	activePrompt: ReflectionPrompt | null
	showReflection: (trigger: ReflectionTrigger, stats: TaskStats) => void
	dismissReflection: () => void
}

export function useReflection(): UseReflectionResult {
	const [activePrompt, setActivePrompt] = useState<ReflectionPrompt | null>(null)

	const showReflection = useCallback(
		(trigger: ReflectionTrigger, stats: TaskStats) => {
			if (shouldShowReflection(trigger, stats)) {
				setActivePrompt(getReflectionPrompt(trigger))
			}
		},
		[]
	)

	const dismissReflection = useCallback(() => {
		setActivePrompt(null)
	}, [])

	return { activePrompt, showReflection, dismissReflection }
}
