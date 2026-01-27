/**
 * Signal recording and retrieval for task emotional/behavioral tracking.
 */

import type { Kysely } from 'kysely'
import type { Database, Signal, SignalKind, ISO8601, UUIDv7 } from '@tender/db'
import { parseSignalRow } from '@tender/db'
import { UUID7Generator } from 'uuid7-typed'

/**
 * Input for recording a new signal.
 */
export interface RecordSignalInput {
	/** The task this signal relates to */
	taskId: string
	/** Type of signal being recorded */
	kind: SignalKind
	/** Additional payload data (optional) */
	payload?: Record<string, unknown>
}

/**
 * Options for signal recording.
 */
export interface RecordSignalOptions {
	/** Override the timestamp (defaults to now) */
	timestamp?: Date
	/** Override the ID (defaults to generated UUIDv7) */
	id?: string
}

/**
 * Formats a Date as an ISO8601 string in UTC.
 */
function toISO8601(date: Date): ISO8601 {
	return date.toISOString() as ISO8601
}

/**
 * Records a new signal for a task.
 *
 * @param db - Kysely database instance
 * @param input - Signal data to record
 * @param options - Optional overrides for timestamp and ID
 * @returns The created signal
 *
 * @example
 * ```ts
 * const signal = await recordSignal(db, {
 *   taskId: 'task-123',
 *   kind: 'reflection',
 *   payload: { text: 'Feeling anxious about this one', moment: 'before' }
 * })
 * ```
 */
export async function recordSignal(
	db: Kysely<Database>,
	input: RecordSignalInput,
	options: RecordSignalOptions = {}
): Promise<Signal> {
	const id = (options.id ?? UUID7Generator.create()) as UUIDv7
	const timestamp = toISO8601(options.timestamp ?? new Date())
	const payload = input.payload ?? {}

	await db
		.insertInto('signals')
		.values({
			id,
			task_id: input.taskId,
			timestamp,
			kind: input.kind,
			payload: JSON.stringify(payload),
		})
		.execute()

	// Return the created signal
	const row = await db
		.selectFrom('signals')
		.selectAll()
		.where('id', '=', id)
		.executeTakeFirstOrThrow()

	return parseSignalRow(row)
}

/**
 * Retrieves all signals for a task, ordered by timestamp (newest first).
 *
 * @param db - Kysely database instance
 * @param taskId - The task ID to get signals for
 * @returns Array of signals, newest first
 *
 * @example
 * ```ts
 * const signals = await getSignalsForTask(db, 'task-123')
 * for (const signal of signals) {
 *   console.log(`${signal.kind} at ${signal.timestamp}`)
 * }
 * ```
 */
export async function getSignalsForTask(
	db: Kysely<Database>,
	taskId: string
): Promise<Signal[]> {
	const rows = await db
		.selectFrom('signals')
		.selectAll()
		.where('task_id', '=', taskId)
		.orderBy('timestamp', 'desc')
		.execute()

	return rows.map((row) => parseSignalRow(row))
}

/**
 * Retrieves signals for a task filtered by kind.
 *
 * @param db - Kysely database instance
 * @param taskId - The task ID to get signals for
 * @param kind - The signal kind to filter by
 * @returns Array of matching signals, newest first
 */
export async function getSignalsByKind(
	db: Kysely<Database>,
	taskId: string,
	kind: SignalKind
): Promise<Signal[]> {
	const rows = await db
		.selectFrom('signals')
		.selectAll()
		.where('task_id', '=', taskId)
		.where('kind', '=', kind)
		.orderBy('timestamp', 'desc')
		.execute()

	return rows.map((row) => parseSignalRow(row))
}

/**
 * Counts the number of times a task has been deferred.
 *
 * Useful for detecting avoidance patterns.
 *
 * @param db - Kysely database instance
 * @param taskId - The task ID to check
 * @returns Number of deferred signals
 */
export async function countDeferrals(
	db: Kysely<Database>,
	taskId: string
): Promise<number> {
	const result = await db
		.selectFrom('signals')
		.select((eb) => eb.fn.countAll<number>().as('count'))
		.where('task_id', '=', taskId)
		.where('kind', '=', 'deferred')
		.executeTakeFirstOrThrow()

	return Number(result.count)
}
