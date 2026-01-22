/**
 * Database schema types and Zod validation schemas.
 *
 * These types mirror the SQLite schema and provide runtime validation
 * for data going into and coming out of the database.
 */

import { z } from 'zod'

// -----------------------------------------------------------------------------
// Branded Types
// -----------------------------------------------------------------------------

/** ISO8601 datetime string (e.g., "2025-01-22T12:00:00Z") */
export type ISO8601 = string & { readonly __brand: 'ISO8601' }

/** UUIDv7 string */
export type UUIDv7 = string & { readonly __brand: 'UUIDv7' }

// -----------------------------------------------------------------------------
// Zod Schemas - Primitives
// -----------------------------------------------------------------------------

/** Validates ISO8601 datetime strings */
export const iso8601Schema = z
	.string()
	.regex(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
		'Must be ISO8601 datetime (e.g., 2025-01-22T12:00:00Z)'
	)
	.transform((s) => s as ISO8601)

/** Validates UUIDv7 strings (basic UUID format check) */
export const uuidv7Schema = z
	.string()
	.regex(
		/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		'Must be a valid UUIDv7'
	)
	.transform((s) => s as UUIDv7)

/** Tags are arrays of strings */
export const tagsSchema = z.array(z.string())

// -----------------------------------------------------------------------------
// Zod Schemas - Recurrence
// -----------------------------------------------------------------------------

/** Interval-based recurrence (relative to last completion) */
export const intervalRecurrenceSchema = z.object({
	type: z.literal('interval'),
	duration: z.string().regex(/^P/, 'Must be ISO8601 duration (e.g., P1W)'),
})

/** RRULE-based recurrence (calendar-anchored) */
export const rruleRecurrenceSchema = z.object({
	type: z.literal('rrule'),
	rule: z.string().regex(/^FREQ=/, 'Must be RFC5545 RRULE'),
})

/** Recurrence is a discriminated union */
export const recurrenceSchema = z.discriminatedUnion('type', [
	intervalRecurrenceSchema,
	rruleRecurrenceSchema,
])

export type Recurrence = z.infer<typeof recurrenceSchema>

// -----------------------------------------------------------------------------
// Zod Schemas - Signal Payloads
// -----------------------------------------------------------------------------

export const deferredPayloadSchema = z.object({
	reason: z.string().optional(),
})

export const completedPayloadSchema = z.object({})

export const surfacedPayloadSchema = z.object({
	acted_on: z.boolean(),
})

/** Unified reflection payload - captures feelings, inquiries, and other user reflections */
export const reflectionPayloadSchema = z.object({
	text: z.string(),
	moment: z.enum(['before', 'after']).optional(),
	prompt: z.string().optional(),
})

export const signalKindSchema = z.enum([
	'deferred',
	'completed',
	'surfaced',
	'reflection',
])

export type SignalKind = z.infer<typeof signalKindSchema>

// -----------------------------------------------------------------------------
// Zod Schemas - Tables
// -----------------------------------------------------------------------------

/** Template row schema */
export const templateSchema = z.object({
	id: uuidv7Schema,
	description: z.string().min(1),
	recurrence: recurrenceSchema,
	preparation_notes: z.string().nullable(),
	tags: tagsSchema,
	created_at: iso8601Schema,
	archived_at: iso8601Schema.nullable(),
})

export type Template = z.infer<typeof templateSchema>

/** Template insert schema (same as row for now) */
export const templateInsertSchema = templateSchema

export type TemplateInsert = z.infer<typeof templateInsertSchema>

/** Task row schema */
export const taskSchema = z.object({
	id: uuidv7Schema,
	template_id: uuidv7Schema.nullable(),
	description: z.string().min(1),
	tags: tagsSchema,
	preparation_notes: z.string().nullable(),
	due_at: iso8601Schema.nullable(),
	created_at: iso8601Schema,
	started_at: iso8601Schema.nullable(),
	completed_at: iso8601Schema.nullable(),
	deleted_at: iso8601Schema.nullable(),
	duration_override: z.number().int().positive().nullable(),
	blocked_by_task_id: uuidv7Schema.nullable(),
	blocked_reason: z.string().nullable(),
})

export type Task = z.infer<typeof taskSchema>

/** Task insert schema */
export const taskInsertSchema = taskSchema

export type TaskInsert = z.infer<typeof taskInsertSchema>

/** Signal row schema */
export const signalSchema = z.object({
	id: uuidv7Schema,
	task_id: uuidv7Schema,
	timestamp: iso8601Schema,
	kind: signalKindSchema,
	payload: z.record(z.string(), z.unknown()), // Loose for now, can tighten per-kind
})

export type Signal = z.infer<typeof signalSchema>

/** Signal insert schema */
export const signalInsertSchema = signalSchema

export type SignalInsert = z.infer<typeof signalInsertSchema>

// -----------------------------------------------------------------------------
// Raw Table Types (for Kysely - matches actual SQLite columns)
// -----------------------------------------------------------------------------

/**
 * Raw templates table row as stored in SQLite.
 * JSON columns are TEXT, timestamps are TEXT strings.
 */
export interface TemplatesTable {
	id: string
	description: string
	recurrence: string // JSON string
	preparation_notes: string | null
	tags: string // JSON string, defaults to '[]'
	created_at: string // ISO8601 string
	archived_at: string | null
}

/**
 * Raw tasks table row as stored in SQLite.
 */
export interface TasksTable {
	id: string
	template_id: string | null
	description: string
	tags: string // JSON string
	preparation_notes: string | null
	due_at: string | null
	created_at: string
	started_at: string | null
	completed_at: string | null
	deleted_at: string | null
	duration_override: number | null
	blocked_by_task_id: string | null
	blocked_reason: string | null
}

/**
 * Raw signals table row as stored in SQLite.
 */
export interface SignalsTable {
	id: string
	task_id: string
	timestamp: string
	kind: string
	payload: string // JSON string
}

/**
 * Kysely database schema with raw table types.
 * Use parse*Row functions to convert to typed application objects.
 */
export interface Database {
	templates: TemplatesTable
	tasks: TasksTable
	signals: SignalsTable
}

// -----------------------------------------------------------------------------
// Row Parsing Utilities
// -----------------------------------------------------------------------------

/**
 * Parses a raw template row from the database.
 * JSON columns are stored as strings, so we parse them.
 */
export function parseTemplateRow(row: Record<string, unknown>): Template {
	return templateSchema.parse({
		...row,
		recurrence: JSON.parse(row['recurrence'] as string),
		tags: JSON.parse(row['tags'] as string),
	})
}

/**
 * Parses a raw task row from the database.
 */
export function parseTaskRow(row: Record<string, unknown>): Task {
	return taskSchema.parse({
		...row,
		tags: JSON.parse(row['tags'] as string),
	})
}

/**
 * Parses a raw signal row from the database.
 */
export function parseSignalRow(row: Record<string, unknown>): Signal {
	return signalSchema.parse({
		...row,
		payload: JSON.parse(row['payload'] as string),
	})
}

// -----------------------------------------------------------------------------
// Row Serialization Utilities
// -----------------------------------------------------------------------------

/**
 * Serializes a template for insertion into the database.
 * Converts JSON fields to strings.
 */
export function serializeTemplate(
	template: TemplateInsert
): Record<string, unknown> {
	return {
		...template,
		recurrence: JSON.stringify(template.recurrence),
		tags: JSON.stringify(template.tags),
	}
}

/**
 * Serializes a task for insertion into the database.
 */
export function serializeTask(task: TaskInsert): Record<string, unknown> {
	return {
		...task,
		tags: JSON.stringify(task.tags),
	}
}

/**
 * Serializes a signal for insertion into the database.
 */
export function serializeSignal(signal: SignalInsert): Record<string, unknown> {
	return {
		...signal,
		payload: JSON.stringify(signal.payload),
	}
}
