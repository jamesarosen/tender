/**
 * Initial schema migration.
 *
 * Creates the core tables: templates, tasks, signals.
 *
 * CHECK constraints enforce:
 * - json_valid() for JSON columns (tags, recurrence, payload)
 * - datetime() for timestamp columns (rejects invalid date strings)
 *
 * Foreign keys use ON DELETE RESTRICT to enforce soft-delete pattern:
 * - Tasks/signals should be soft-deleted via deleted_at timestamp
 * - Templates should be soft-deleted via archived_at timestamp
 * - Hard deletes are blocked to preserve data for analysis
 */

import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
	// Create templates table
	await sql`
		CREATE TABLE templates (
			id TEXT PRIMARY KEY,
			description TEXT NOT NULL,
			recurrence TEXT NOT NULL CHECK (json_valid(recurrence)),
			preparation_notes TEXT,
			tags TEXT DEFAULT '[]' CHECK (json_valid(tags)),
			created_at TEXT NOT NULL CHECK (datetime(created_at) IS NOT NULL),
			archived_at TEXT CHECK (archived_at IS NULL OR datetime(archived_at) IS NOT NULL)
		)
	`.execute(db)

	await sql`CREATE INDEX templates_archived_at ON templates(archived_at)`.execute(
		db
	)

	// Create tasks table
	await sql`
		CREATE TABLE tasks (
			id TEXT PRIMARY KEY,
			template_id TEXT REFERENCES templates(id) ON DELETE RESTRICT,
			description TEXT NOT NULL,
			tags TEXT DEFAULT '[]' CHECK (json_valid(tags)),
			preparation_notes TEXT,
			due_at TEXT CHECK (due_at IS NULL OR datetime(due_at) IS NOT NULL),
			created_at TEXT NOT NULL CHECK (datetime(created_at) IS NOT NULL),
			started_at TEXT CHECK (started_at IS NULL OR datetime(started_at) IS NOT NULL),
			completed_at TEXT CHECK (completed_at IS NULL OR datetime(completed_at) IS NOT NULL),
			deleted_at TEXT CHECK (deleted_at IS NULL OR datetime(deleted_at) IS NOT NULL),
			duration_override INTEGER,
			blocked_by_task_id TEXT REFERENCES tasks(id) ON DELETE RESTRICT,
			blocked_reason TEXT
		)
	`.execute(db)

	await sql`CREATE INDEX tasks_template_id ON tasks(template_id)`.execute(db)
	await sql`CREATE INDEX tasks_due_at ON tasks(due_at)`.execute(db)
	await sql`CREATE INDEX tasks_completed_at ON tasks(completed_at)`.execute(db)
	await sql`CREATE INDEX tasks_deleted_at ON tasks(deleted_at)`.execute(db)
	await sql`CREATE INDEX tasks_blocked_by ON tasks(blocked_by_task_id)`.execute(
		db
	)

	// Create signals table
	await sql`
		CREATE TABLE signals (
			id TEXT PRIMARY KEY,
			task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
			timestamp TEXT NOT NULL CHECK (datetime(timestamp) IS NOT NULL),
			kind TEXT NOT NULL,
			payload TEXT DEFAULT '{}' CHECK (json_valid(payload))
		)
	`.execute(db)

	await sql`CREATE INDEX signals_task_id ON signals(task_id)`.execute(db)
	await sql`CREATE INDEX signals_timestamp ON signals(timestamp)`.execute(db)
	await sql`CREATE INDEX signals_kind ON signals(kind)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
	await sql`DROP TABLE IF EXISTS signals`.execute(db)
	await sql`DROP TABLE IF EXISTS tasks`.execute(db)
	await sql`DROP TABLE IF EXISTS templates`.execute(db)
}
