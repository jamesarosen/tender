/**
 * Tests for signal recording and retrieval.
 */

import type { Client } from '@libsql/client'
import type { ISO8601 } from '@tender/db'
import { describe, expect, test } from '@tender/db/test-setup'
import { UUID7Generator } from 'uuid7-typed'
import {
	recordSignal,
	getSignalsForTask,
	getSignalsByKind,
	countDeferrals,
	getLatestDeferralTimestamps,
} from './signals.js'

// Helper to create a task for testing with a valid UUIDv7
async function createTestTask(client: Client): Promise<string> {
	const id = UUID7Generator.create()
	await client.execute({
		sql: `INSERT INTO tasks (id, description, created_at) VALUES (?, ?, ?)`,
		args: [id, 'Test task', '2025-01-01T00:00:00Z'],
	})
	return id
}

describe('recordSignal', () => {
	test('records a signal with all fields', async ({ client, db }) => {
		const taskId = await createTestTask(client)

		const signal = await recordSignal(db, {
			taskId,
			kind: 'reflection',
			payload: { text: 'Feeling anxious', moment: 'before' },
		})

		expect(signal.task_id).toBe(taskId)
		expect(signal.kind).toBe('reflection')
		expect(signal.payload).toEqual({ text: 'Feeling anxious', moment: 'before' })
		expect(signal.id).toBeDefined()
		expect(signal.timestamp).toBeDefined()
	})

	test('records a signal with minimal fields', async ({ client, db }) => {
		const taskId = await createTestTask(client)

		const signal = await recordSignal(db, {
			taskId,
			kind: 'completed',
		})

		expect(signal.task_id).toBe(taskId)
		expect(signal.kind).toBe('completed')
		expect(signal.payload).toEqual({})
	})

	test('allows custom timestamp', async ({ client, db }) => {
		const taskId = await createTestTask(client)
		const customTime = new Date('2025-06-15T10:30:00Z')

		const signal = await recordSignal(
			db,
			{ taskId, kind: 'surfaced' },
			{ timestamp: customTime }
		)

		expect(signal.timestamp).toBe('2025-06-15T10:30:00.000Z')
	})

	test('allows custom ID', async ({ client, db }) => {
		const taskId = await createTestTask(client)
		const customId = '01945b5e-7000-7000-8000-000000000001'

		const signal = await recordSignal(
			db,
			{ taskId, kind: 'deferred' },
			{ id: customId }
		)

		expect(signal.id).toBe(customId)
	})

	test('throws for non-existent task', async ({ db }) => {
		const nonExistentId = UUID7Generator.create()
		await expect(
			recordSignal(db, {
				taskId: nonExistentId,
				kind: 'completed',
			})
		).rejects.toThrow(/FOREIGN KEY constraint failed/)
	})
})

describe('getSignalsForTask', () => {
	test('returns empty array for task with no signals', async ({
		client,
		db,
	}) => {
		const taskId = await createTestTask(client)

		const signals = await getSignalsForTask(db, taskId)

		expect(signals).toEqual([])
	})

	test('returns signals ordered by timestamp (newest first)', async ({
		client,
		db,
	}) => {
		const taskId = await createTestTask(client)

		// Record signals with explicit timestamps
		await recordSignal(
			db,
			{ taskId, kind: 'surfaced' },
			{ timestamp: new Date('2025-01-01T10:00:00Z') }
		)
		await recordSignal(
			db,
			{ taskId, kind: 'deferred' },
			{ timestamp: new Date('2025-01-01T11:00:00Z') }
		)
		await recordSignal(
			db,
			{ taskId, kind: 'completed' },
			{ timestamp: new Date('2025-01-01T12:00:00Z') }
		)

		const signals = await getSignalsForTask(db, taskId)

		expect(signals).toHaveLength(3)
		expect(signals[0].kind).toBe('completed') // newest
		expect(signals[1].kind).toBe('deferred')
		expect(signals[2].kind).toBe('surfaced') // oldest
	})

	test('only returns signals for specified task', async ({ client, db }) => {
		const taskId1 = await createTestTask(client)
		const taskId2 = await createTestTask(client)

		await recordSignal(db, { taskId: taskId1, kind: 'completed' })
		await recordSignal(db, { taskId: taskId2, kind: 'deferred' })
		await recordSignal(db, { taskId: taskId1, kind: 'reflection' })

		const signals = await getSignalsForTask(db, taskId1)

		expect(signals).toHaveLength(2)
		expect(signals.every((s) => s.task_id === taskId1)).toBe(true)
	})
})

describe('getSignalsByKind', () => {
	test('filters signals by kind', async ({ client, db }) => {
		const taskId = await createTestTask(client)

		await recordSignal(db, { taskId, kind: 'surfaced' })
		await recordSignal(db, { taskId, kind: 'deferred' })
		await recordSignal(db, { taskId, kind: 'deferred' })
		await recordSignal(db, { taskId, kind: 'completed' })

		const deferrals = await getSignalsByKind(db, taskId, 'deferred')

		expect(deferrals).toHaveLength(2)
		expect(deferrals.every((s) => s.kind === 'deferred')).toBe(true)
	})

	test('returns empty array when no signals match kind', async ({
		client,
		db,
	}) => {
		const taskId = await createTestTask(client)

		await recordSignal(db, { taskId, kind: 'completed' })

		const reflections = await getSignalsByKind(db, taskId, 'reflection')

		expect(reflections).toEqual([])
	})
})

describe('countDeferrals', () => {
	test('returns 0 for task with no deferrals', async ({ client, db }) => {
		const taskId = await createTestTask(client)

		const count = await countDeferrals(db, taskId)

		expect(count).toBe(0)
	})

	test('counts only deferred signals', async ({ client, db }) => {
		const taskId = await createTestTask(client)

		await recordSignal(db, { taskId, kind: 'surfaced' })
		await recordSignal(db, { taskId, kind: 'deferred' })
		await recordSignal(db, { taskId, kind: 'deferred' })
		await recordSignal(db, { taskId, kind: 'completed' })
		await recordSignal(db, { taskId, kind: 'deferred' })

		const count = await countDeferrals(db, taskId)

		expect(count).toBe(3)
	})

	test('only counts deferrals for specified task', async ({ client, db }) => {
		const taskId1 = await createTestTask(client)
		const taskId2 = await createTestTask(client)

		await recordSignal(db, { taskId: taskId1, kind: 'deferred' })
		await recordSignal(db, { taskId: taskId2, kind: 'deferred' })
		await recordSignal(db, { taskId: taskId2, kind: 'deferred' })

		const count = await countDeferrals(db, taskId1)

		expect(count).toBe(1)
	})
})

describe('getLatestDeferralTimestamps', () => {
	test('returns empty map for empty task list', async ({ db }) => {
		const result = await getLatestDeferralTimestamps(
			db,
			[],
			'2025-01-01T00:00:00.000Z' as ISO8601
		)

		expect(result.size).toBe(0)
	})

	test('returns empty map when no deferrals since cutoff', async ({
		client,
		db,
	}) => {
		const taskId = await createTestTask(client)

		await recordSignal(
			db,
			{ taskId, kind: 'deferred' },
			{ timestamp: new Date('2025-01-01T08:00:00Z') }
		)

		const result = await getLatestDeferralTimestamps(
			db,
			[taskId],
			'2025-01-02T00:00:00.000Z' as ISO8601
		)

		expect(result.size).toBe(0)
	})

	test('returns latest deferral per task since cutoff', async ({
		client,
		db,
	}) => {
		const taskId1 = await createTestTask(client)
		const taskId2 = await createTestTask(client)

		// taskId1: deferred twice today
		await recordSignal(
			db,
			{ taskId: taskId1, kind: 'deferred' },
			{ timestamp: new Date('2025-01-15T09:00:00Z') }
		)
		await recordSignal(
			db,
			{ taskId: taskId1, kind: 'deferred' },
			{ timestamp: new Date('2025-01-15T11:00:00Z') }
		)

		// taskId2: deferred once today
		await recordSignal(
			db,
			{ taskId: taskId2, kind: 'deferred' },
			{ timestamp: new Date('2025-01-15T10:00:00Z') }
		)

		const result = await getLatestDeferralTimestamps(
			db,
			[taskId1, taskId2],
			'2025-01-15T00:00:00.000Z' as ISO8601
		)

		expect(result.size).toBe(2)
		expect(result.get(taskId1)).toBe('2025-01-15T11:00:00.000Z')
		expect(result.get(taskId2)).toBe('2025-01-15T10:00:00.000Z')
	})

	test('ignores non-deferred signals', async ({ client, db }) => {
		const taskId = await createTestTask(client)

		await recordSignal(
			db,
			{ taskId, kind: 'completed' },
			{ timestamp: new Date('2025-01-15T09:00:00Z') }
		)
		await recordSignal(
			db,
			{ taskId, kind: 'surfaced' },
			{ timestamp: new Date('2025-01-15T10:00:00Z') }
		)

		const result = await getLatestDeferralTimestamps(
			db,
			[taskId],
			'2025-01-15T00:00:00.000Z' as ISO8601
		)

		expect(result.size).toBe(0)
	})

	test('only includes tasks from the provided list', async ({ client, db }) => {
		const taskId1 = await createTestTask(client)
		const taskId2 = await createTestTask(client)

		await recordSignal(
			db,
			{ taskId: taskId1, kind: 'deferred' },
			{ timestamp: new Date('2025-01-15T09:00:00Z') }
		)
		await recordSignal(
			db,
			{ taskId: taskId2, kind: 'deferred' },
			{ timestamp: new Date('2025-01-15T10:00:00Z') }
		)

		const result = await getLatestDeferralTimestamps(
			db,
			[taskId1],
			'2025-01-15T00:00:00.000Z' as ISO8601
		)

		expect(result.size).toBe(1)
		expect(result.has(taskId1)).toBe(true)
		expect(result.has(taskId2)).toBe(false)
	})
})
