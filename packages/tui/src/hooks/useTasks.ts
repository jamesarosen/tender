import { useState, useCallback, useEffect } from 'react'
import type { Kysely } from 'kysely'
import type { Database, Task, ISO8601 } from '@tender/db'
import { parseTaskRow } from '@tender/db'
import { dueDateAgeStrategy } from '@tender/agent'
import { countDeferrals } from '@tender/domain'
import { UUID7Generator } from 'uuid7-typed'

export interface UseTasksResult {
	tasks: Task[]
	loading: boolean
	refresh: () => Promise<void>
	createTask: (description: string, dueAt?: string) => Promise<Task>
	completeTask: (taskId: string) => Promise<void>
	startTask: (taskId: string) => Promise<void>
	deleteTask: (taskId: string) => Promise<void>
}

function toISO8601(date: Date): ISO8601 {
	return date.toISOString() as ISO8601
}

async function getActiveTasks(db: Kysely<Database>): Promise<Task[]> {
	const rows = await db
		.selectFrom('tasks')
		.selectAll()
		.where('completed_at', 'is', null)
		.where('deleted_at', 'is', null)
		.where('blocked_by_task_id', 'is', null)
		.execute()

	return rows.map((row) => parseTaskRow(row))
}

export function useTasks(db: Kysely<Database>): UseTasksResult {
	const [tasks, setTasks] = useState<Task[]>([])
	const [loading, setLoading] = useState(true)

	const refresh = useCallback(async () => {
		setLoading(true)
		const result = await getActiveTasks(db)
		const ranked = dueDateAgeStrategy.rank(result)
		setTasks(ranked)
		setLoading(false)
	}, [db])

	useEffect(() => {
		refresh()
	}, [refresh])

	const createTask = useCallback(
		async (description: string, dueAt?: string): Promise<Task> => {
			const id = UUID7Generator.create()
			const created_at = toISO8601(new Date())

			await db
				.insertInto('tasks')
				.values({
					id,
					template_id: null,
					description,
					tags: '[]',
					preparation_notes: null,
					due_at: dueAt ?? null,
					created_at,
					started_at: null,
					completed_at: null,
					deleted_at: null,
					duration_override: null,
					blocked_by_task_id: null,
					blocked_reason: null,
				})
				.execute()

			const row = await db
				.selectFrom('tasks')
				.selectAll()
				.where('id', '=', id)
				.executeTakeFirstOrThrow()

			await refresh()
			return parseTaskRow(row)
		},
		[db, refresh]
	)

	const completeTask = useCallback(
		async (taskId: string) => {
			await db
				.updateTable('tasks')
				.set({ completed_at: toISO8601(new Date()) })
				.where('id', '=', taskId)
				.execute()
			await refresh()
		},
		[db, refresh]
	)

	const startTask = useCallback(
		async (taskId: string) => {
			const task = tasks.find((t) => t.id === taskId)
			if (!task) return

			// Toggle started_at
			const newStartedAt = task.started_at ? null : toISO8601(new Date())
			await db
				.updateTable('tasks')
				.set({ started_at: newStartedAt })
				.where('id', '=', taskId)
				.execute()
			await refresh()
		},
		[db, tasks, refresh]
	)

	const deleteTask = useCallback(
		async (taskId: string) => {
			await db
				.updateTable('tasks')
				.set({ deleted_at: toISO8601(new Date()) })
				.where('id', '=', taskId)
				.execute()
			await refresh()
		},
		[db, refresh]
	)

	return {
		tasks,
		loading,
		refresh,
		createTask,
		completeTask,
		startTask,
		deleteTask,
	}
}

export interface TaskStats {
	deferralCount: number
	daysSinceCreated: number
}

export async function getTaskStats(
	db: Kysely<Database>,
	task: Task
): Promise<TaskStats> {
	const deferralCount = await countDeferrals(db, task.id)
	const created = new Date(task.created_at)
	const now = new Date()
	const daysSinceCreated = Math.floor(
		(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
	)

	return { deferralCount, daysSinceCreated }
}
