import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from 'ink-testing-library'
import { TaskCard, TaskListItem } from './TaskCard.js'
import type { Task, ISO8601, UUIDv7 } from '@tender/db'

function createMockTask(overrides: Partial<Task> = {}): Task {
	return {
		id: '01234567-0123-7000-8000-000000000000' as UUIDv7,
		template_id: null,
		description: 'Test task',
		tags: [],
		preparation_notes: null,
		due_at: null,
		created_at: '2025-01-01T00:00:00Z' as ISO8601,
		started_at: null,
		completed_at: null,
		deleted_at: null,
		duration_override: null,
		blocked_by_task_id: null,
		blocked_reason: null,
		...overrides,
	}
}

describe('TaskCard', () => {
	it('displays task description', () => {
		const task = createMockTask({ description: 'Email grandma' })
		const { lastFrame } = render(<TaskCard task={task} />)
		expect(lastFrame()).toContain('Email grandma')
	})

	it('displays tags', () => {
		const task = createMockTask({ tags: ['family', 'urgent'] })
		const { lastFrame } = render(<TaskCard task={task} />)
		expect(lastFrame()).toContain('[family]')
		expect(lastFrame()).toContain('[urgent]')
	})

	it('displays due date', () => {
		const tomorrow = new Date()
		tomorrow.setDate(tomorrow.getDate() + 1)
		const task = createMockTask({
			due_at: tomorrow.toISOString() as ISO8601,
		})
		const { lastFrame } = render(<TaskCard task={task} />)
		expect(lastFrame()).toContain('Due: Tomorrow')
	})

	it('displays age when provided', () => {
		const task = createMockTask()
		const { lastFrame } = render(<TaskCard task={task} daysSinceCreated={3} />)
		expect(lastFrame()).toContain('3 days old')
	})

	it('hides details when showDetails is false', () => {
		const task = createMockTask({
			tags: ['hidden'],
			due_at: '2025-01-15T00:00:00Z' as ISO8601,
		})
		const { lastFrame } = render(
			<TaskCard task={task} showDetails={false} daysSinceCreated={5} />
		)
		expect(lastFrame()).toContain('Test task')
		expect(lastFrame()).not.toContain('[hidden]')
		expect(lastFrame()).not.toContain('days old')
	})
})

describe('TaskListItem', () => {
	it('displays task with index', () => {
		const task = createMockTask({ description: 'First task' })
		const { lastFrame } = render(<TaskListItem task={task} index={0} />)
		expect(lastFrame()).toContain('1. First task')
	})

	it('shows selection indicator when selected', () => {
		const task = createMockTask()
		const { lastFrame } = render(
			<TaskListItem task={task} index={0} selected={true} />
		)
		expect(lastFrame()).toContain('>')
	})

	it('hides selection indicator when not selected', () => {
		const task = createMockTask()
		const { lastFrame } = render(
			<TaskListItem task={task} index={0} selected={false} />
		)
		// The output should start with space instead of >
		expect(lastFrame()?.startsWith('>')).toBe(false)
	})
})
