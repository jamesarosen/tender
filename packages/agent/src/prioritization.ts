import type { Task } from '@tender/db'
import type { PrioritizationStrategy } from './types.js'

/**
 * Default prioritization strategy for degraded mode.
 *
 * Sorts tasks by:
 * 1. Tasks with due dates come first, sorted by due date (earliest first)
 * 2. Tasks without due dates sorted by creation date (oldest first)
 *
 * This provides a simple, predictable ordering when the LLM is unavailable.
 */
export const dueDateAgeStrategy: PrioritizationStrategy = {
	name: 'due-date-age',
	rank(tasks: Task[]): Task[] {
		// Don't mutate input array
		return [...tasks].sort((a, b) => {
			// Both have due dates: sort by due date
			if (a.due_at && b.due_at) {
				return a.due_at.localeCompare(b.due_at)
			}

			// Only a has due date: a comes first
			if (a.due_at && !b.due_at) {
				return -1
			}

			// Only b has due date: b comes first
			if (!a.due_at && b.due_at) {
				return 1
			}

			// Neither has due date: sort by creation date (oldest first)
			return a.created_at.localeCompare(b.created_at)
		})
	},
}

/**
 * Strategy that prioritizes by creation date only (oldest first).
 * Useful for FIFO-style processing.
 */
export const ageOnlyStrategy: PrioritizationStrategy = {
	name: 'age-only',
	rank(tasks: Task[]): Task[] {
		return [...tasks].sort((a, b) => a.created_at.localeCompare(b.created_at))
	},
}

/**
 * Strategy that prioritizes by due date only.
 * Tasks without due dates are placed at the end.
 */
export const dueDateOnlyStrategy: PrioritizationStrategy = {
	name: 'due-date-only',
	rank(tasks: Task[]): Task[] {
		return [...tasks].sort((a, b) => {
			// Both have due dates
			if (a.due_at && b.due_at) {
				return a.due_at.localeCompare(b.due_at)
			}

			// Only a has due date: a comes first
			if (a.due_at && !b.due_at) {
				return -1
			}

			// Only b has due date: b comes first
			if (!a.due_at && b.due_at) {
				return 1
			}

			// Neither has due date: maintain original order
			return 0
		})
	},
}

/**
 * Registry of available prioritization strategies.
 */
export const strategies: Record<string, PrioritizationStrategy> = {
	'due-date-age': dueDateAgeStrategy,
	'age-only': ageOnlyStrategy,
	'due-date-only': dueDateOnlyStrategy,
}

/**
 * Gets a strategy by name, falling back to the default if not found.
 */
export function getStrategy(name: string): PrioritizationStrategy {
	return strategies[name] ?? dueDateAgeStrategy
}

/**
 * The default strategy used in degraded mode.
 */
export const defaultStrategy = dueDateAgeStrategy
