import { describe, it, expect } from 'vitest'
import type { Task } from '@tender/db'
import {
	dueDateAgeStrategy,
	ageOnlyStrategy,
	dueDateOnlyStrategy,
	getStrategy,
	defaultStrategy,
} from './prioritization.js'

// Helper to create minimal Task objects for testing
function createTask(overrides: Partial<Task>): Task {
	return {
		id: overrides.id ?? ('01234567-0123-7abc-8def-0123456789ab' as Task['id']),
		template_id: overrides.template_id ?? null,
		description: overrides.description ?? 'Test task',
		tags: overrides.tags ?? [],
		preparation_notes: overrides.preparation_notes ?? null,
		due_at: overrides.due_at ?? null,
		created_at:
			overrides.created_at ?? ('2025-01-01T00:00:00Z' as Task['created_at']),
		started_at: overrides.started_at ?? null,
		completed_at: overrides.completed_at ?? null,
		deleted_at: overrides.deleted_at ?? null,
		duration_override: overrides.duration_override ?? null,
		blocked_by_task_id: overrides.blocked_by_task_id ?? null,
		blocked_reason: overrides.blocked_reason ?? null,
	}
}

describe('prioritization strategies', () => {
	describe('dueDateAgeStrategy', () => {
		it('sorts tasks with due dates before tasks without', () => {
			const taskWithDue = createTask({
				id: '01234567-0123-7abc-8def-000000000001' as Task['id'],
				due_at: '2025-02-01T00:00:00Z' as Task['due_at'],
			})
			const taskWithoutDue = createTask({
				id: '01234567-0123-7abc-8def-000000000002' as Task['id'],
				due_at: null,
			})

			const result = dueDateAgeStrategy.rank([taskWithoutDue, taskWithDue])

			expect(result[0].id).toBe(taskWithDue.id)
			expect(result[1].id).toBe(taskWithoutDue.id)
		})

		it('sorts tasks with due dates by due date (earliest first)', () => {
			const laterDue = createTask({
				id: '01234567-0123-7abc-8def-000000000001' as Task['id'],
				due_at: '2025-02-15T00:00:00Z' as Task['due_at'],
			})
			const earlierDue = createTask({
				id: '01234567-0123-7abc-8def-000000000002' as Task['id'],
				due_at: '2025-02-01T00:00:00Z' as Task['due_at'],
			})

			const result = dueDateAgeStrategy.rank([laterDue, earlierDue])

			expect(result[0].id).toBe(earlierDue.id)
			expect(result[1].id).toBe(laterDue.id)
		})

		it('sorts tasks without due dates by creation date (oldest first)', () => {
			const newer = createTask({
				id: '01234567-0123-7abc-8def-000000000001' as Task['id'],
				created_at: '2025-01-15T00:00:00Z' as Task['created_at'],
			})
			const older = createTask({
				id: '01234567-0123-7abc-8def-000000000002' as Task['id'],
				created_at: '2025-01-01T00:00:00Z' as Task['created_at'],
			})

			const result = dueDateAgeStrategy.rank([newer, older])

			expect(result[0].id).toBe(older.id)
			expect(result[1].id).toBe(newer.id)
		})

		it('does not mutate the input array', () => {
			const tasks = [
				createTask({
					id: '01234567-0123-7abc-8def-000000000001' as Task['id'],
				}),
				createTask({
					id: '01234567-0123-7abc-8def-000000000002' as Task['id'],
				}),
			]
			const originalOrder = tasks.map((t) => t.id)

			dueDateAgeStrategy.rank(tasks)

			expect(tasks.map((t) => t.id)).toEqual(originalOrder)
		})

		it('handles empty array', () => {
			const result = dueDateAgeStrategy.rank([])
			expect(result).toEqual([])
		})

		it('handles single task', () => {
			const task = createTask({})
			const result = dueDateAgeStrategy.rank([task])
			expect(result).toEqual([task])
		})

		it('has correct name', () => {
			expect(dueDateAgeStrategy.name).toBe('due-date-age')
		})
	})

	describe('ageOnlyStrategy', () => {
		it('sorts by creation date (oldest first)', () => {
			const newest = createTask({
				id: '01234567-0123-7abc-8def-000000000001' as Task['id'],
				created_at: '2025-01-20T00:00:00Z' as Task['created_at'],
			})
			const middle = createTask({
				id: '01234567-0123-7abc-8def-000000000002' as Task['id'],
				created_at: '2025-01-10T00:00:00Z' as Task['created_at'],
			})
			const oldest = createTask({
				id: '01234567-0123-7abc-8def-000000000003' as Task['id'],
				created_at: '2025-01-01T00:00:00Z' as Task['created_at'],
			})

			const result = ageOnlyStrategy.rank([newest, middle, oldest])

			expect(result.map((t) => t.id)).toEqual([oldest.id, middle.id, newest.id])
		})

		it('ignores due dates', () => {
			const newerWithDue = createTask({
				id: '01234567-0123-7abc-8def-000000000001' as Task['id'],
				created_at: '2025-01-20T00:00:00Z' as Task['created_at'],
				due_at: '2025-01-21T00:00:00Z' as Task['due_at'],
			})
			const olderNoDue = createTask({
				id: '01234567-0123-7abc-8def-000000000002' as Task['id'],
				created_at: '2025-01-01T00:00:00Z' as Task['created_at'],
				due_at: null,
			})

			const result = ageOnlyStrategy.rank([newerWithDue, olderNoDue])

			expect(result[0].id).toBe(olderNoDue.id)
		})

		it('has correct name', () => {
			expect(ageOnlyStrategy.name).toBe('age-only')
		})
	})

	describe('dueDateOnlyStrategy', () => {
		it('sorts by due date (earliest first)', () => {
			const later = createTask({
				id: '01234567-0123-7abc-8def-000000000001' as Task['id'],
				due_at: '2025-02-15T00:00:00Z' as Task['due_at'],
			})
			const earlier = createTask({
				id: '01234567-0123-7abc-8def-000000000002' as Task['id'],
				due_at: '2025-02-01T00:00:00Z' as Task['due_at'],
			})

			const result = dueDateOnlyStrategy.rank([later, earlier])

			expect(result[0].id).toBe(earlier.id)
			expect(result[1].id).toBe(later.id)
		})

		it('puts tasks without due dates at the end', () => {
			const withDue = createTask({
				id: '01234567-0123-7abc-8def-000000000001' as Task['id'],
				due_at: '2025-02-01T00:00:00Z' as Task['due_at'],
			})
			const noDue = createTask({
				id: '01234567-0123-7abc-8def-000000000002' as Task['id'],
				due_at: null,
			})

			const result = dueDateOnlyStrategy.rank([noDue, withDue])

			expect(result[0].id).toBe(withDue.id)
			expect(result[1].id).toBe(noDue.id)
		})

		it('has correct name', () => {
			expect(dueDateOnlyStrategy.name).toBe('due-date-only')
		})
	})

	describe('getStrategy', () => {
		it('returns named strategy', () => {
			expect(getStrategy('due-date-age')).toBe(dueDateAgeStrategy)
			expect(getStrategy('age-only')).toBe(ageOnlyStrategy)
			expect(getStrategy('due-date-only')).toBe(dueDateOnlyStrategy)
		})

		it('returns default for unknown strategy', () => {
			expect(getStrategy('unknown-strategy')).toBe(dueDateAgeStrategy)
		})
	})

	describe('defaultStrategy', () => {
		it('is dueDateAgeStrategy', () => {
			expect(defaultStrategy).toBe(dueDateAgeStrategy)
		})
	})
})
