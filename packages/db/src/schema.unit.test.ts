/**
 * Unit tests for schema validation (Zod schemas).
 */

import { describe, expect, it } from 'vitest'
import type { ISO8601, UUIDv7 } from './schema.js'
import {
	iso8601Schema,
	uuidv7Schema,
	recurrenceSchema,
	templateSchema,
	taskSchema,
	signalSchema,
	parseTemplateRow,
	parseTaskRow,
	parseSignalRow,
	serializeTemplate,
} from './schema.js'

describe('iso8601Schema', () => {
	it('accepts valid ISO8601 with Z timezone', () => {
		const result = iso8601Schema.safeParse('2025-01-22T12:00:00Z')
		expect(result.success).toBe(true)
	})

	it('accepts valid ISO8601 with offset timezone', () => {
		const result = iso8601Schema.safeParse('2025-01-22T12:00:00+05:30')
		expect(result.success).toBe(true)
	})

	it('accepts valid ISO8601 with milliseconds', () => {
		const result = iso8601Schema.safeParse('2025-01-22T12:00:00.123Z')
		expect(result.success).toBe(true)
	})

	it('rejects date without time', () => {
		const result = iso8601Schema.safeParse('2025-01-22')
		expect(result.success).toBe(false)
	})

	it('rejects datetime without timezone', () => {
		const result = iso8601Schema.safeParse('2025-01-22T12:00:00')
		expect(result.success).toBe(false)
	})

	it('rejects garbage', () => {
		const result = iso8601Schema.safeParse('not-a-date')
		expect(result.success).toBe(false)
	})
})

describe('uuidv7Schema', () => {
	it('accepts valid UUIDv7', () => {
		// UUIDv7 has version 7 in position 13
		const result = uuidv7Schema.safeParse('01945b5e-7000-7000-8000-000000000000')
		expect(result.success).toBe(true)
	})

	it('rejects UUIDv4', () => {
		// UUIDv4 has version 4 in position 13
		const result = uuidv7Schema.safeParse('550e8400-e29b-41d4-a716-446655440000')
		expect(result.success).toBe(false)
	})

	it('rejects garbage', () => {
		const result = uuidv7Schema.safeParse('not-a-uuid')
		expect(result.success).toBe(false)
	})
})

describe('recurrenceSchema', () => {
	it('accepts interval recurrence', () => {
		const result = recurrenceSchema.safeParse({
			type: 'interval',
			duration: 'P1W',
		})
		expect(result.success).toBe(true)
	})

	it('accepts rrule recurrence', () => {
		const result = recurrenceSchema.safeParse({
			type: 'rrule',
			rule: 'FREQ=WEEKLY;BYDAY=SU',
		})
		expect(result.success).toBe(true)
	})

	it('rejects invalid duration format', () => {
		const result = recurrenceSchema.safeParse({
			type: 'interval',
			duration: '1 week',
		})
		expect(result.success).toBe(false)
	})

	it('rejects invalid rrule format', () => {
		const result = recurrenceSchema.safeParse({
			type: 'rrule',
			rule: 'every sunday',
		})
		expect(result.success).toBe(false)
	})

	it('rejects unknown type', () => {
		const result = recurrenceSchema.safeParse({
			type: 'cron',
			expression: '0 0 * * 0',
		})
		expect(result.success).toBe(false)
	})
})

describe('templateSchema', () => {
	const validTemplate = {
		id: '01945b5e-7000-7000-8000-000000000000',
		description: 'Test template',
		recurrence: { type: 'interval' as const, duration: 'P1W' },
		preparation_notes: null,
		tags: ['kitchen', 'maintenance'],
		created_at: '2025-01-22T12:00:00Z',
		archived_at: null,
	}

	it('accepts valid template', () => {
		const result = templateSchema.safeParse(validTemplate)
		expect(result.success).toBe(true)
	})

	it('rejects template without recurrence', () => {
		const result = templateSchema.safeParse({
			...validTemplate,
			recurrence: null,
		})
		expect(result.success).toBe(false)
	})

	it('rejects empty description', () => {
		const result = templateSchema.safeParse({
			...validTemplate,
			description: '',
		})
		expect(result.success).toBe(false)
	})

	it('rejects invalid created_at', () => {
		const result = templateSchema.safeParse({
			...validTemplate,
			created_at: 'invalid',
		})
		expect(result.success).toBe(false)
	})
})

describe('taskSchema', () => {
	const validTask = {
		id: '01945b5e-7000-7000-8000-000000000001',
		template_id: null,
		description: 'Test task',
		tags: [],
		preparation_notes: null,
		due_at: '2025-01-25T12:00:00Z',
		created_at: '2025-01-22T12:00:00Z',
		started_at: null,
		completed_at: null,
		deleted_at: null,
		duration_override: null,
		blocked_by_task_id: null,
		blocked_reason: null,
	}

	it('accepts valid task', () => {
		const result = taskSchema.safeParse(validTask)
		expect(result.success).toBe(true)
	})

	it('accepts task with all timestamps', () => {
		const result = taskSchema.safeParse({
			...validTask,
			started_at: '2025-01-22T13:00:00Z',
			completed_at: '2025-01-22T14:00:00Z',
		})
		expect(result.success).toBe(true)
	})

	it('rejects negative duration_override', () => {
		const result = taskSchema.safeParse({
			...validTask,
			duration_override: -5,
		})
		expect(result.success).toBe(false)
	})
})

describe('signalSchema', () => {
	const validSignal = {
		id: '01945b5e-7000-7000-8000-000000000002',
		task_id: '01945b5e-7000-7000-8000-000000000001',
		timestamp: '2025-01-22T12:00:00Z',
		kind: 'reflection' as const,
		payload: { text: 'anxious', moment: 'before' },
	}

	it('accepts valid signal', () => {
		const result = signalSchema.safeParse(validSignal)
		expect(result.success).toBe(true)
	})

	it('accepts all signal kinds', () => {
		const kinds = ['deferred', 'completed', 'surfaced', 'reflection']
		for (const kind of kinds) {
			const result = signalSchema.safeParse({ ...validSignal, kind })
			expect(result.success).toBe(true)
		}
	})

	it('rejects invalid kind', () => {
		const result = signalSchema.safeParse({
			...validSignal,
			kind: 'unknown',
		})
		expect(result.success).toBe(false)
	})
})

describe('parseTemplateRow', () => {
	it('parses raw database row', () => {
		const row = {
			id: '01945b5e-7000-7000-8000-000000000000',
			description: 'Test',
			recurrence: '{"type":"interval","duration":"P1W"}',
			preparation_notes: null,
			tags: '["kitchen"]',
			created_at: '2025-01-22T12:00:00Z',
			archived_at: null,
		}

		const template = parseTemplateRow(row)

		expect(template.recurrence).toEqual({ type: 'interval', duration: 'P1W' })
		expect(template.tags).toEqual(['kitchen'])
	})
})

describe('serializeTemplate', () => {
	it('serializes template for database', () => {
		const template = {
			id: '01945b5e-7000-7000-8000-000000000000' as UUIDv7,
			description: 'Test',
			recurrence: { type: 'interval' as const, duration: 'P1W' },
			preparation_notes: null,
			tags: ['kitchen'],
			created_at: '2025-01-22T12:00:00Z' as ISO8601,
			archived_at: null,
		}

		const serialized = serializeTemplate(template)

		expect(serialized['recurrence']).toBe('{"type":"interval","duration":"P1W"}')
		expect(serialized['tags']).toBe('["kitchen"]')
	})
})

describe('parseTaskRow', () => {
	it('parses raw database row', () => {
		const row = {
			id: '01945b5e-7000-7000-8000-000000000001',
			template_id: null,
			description: 'Test task',
			tags: '["urgent"]',
			preparation_notes: null,
			due_at: null,
			created_at: '2025-01-22T12:00:00Z',
			started_at: null,
			completed_at: null,
			deleted_at: null,
			duration_override: null,
			blocked_by_task_id: null,
			blocked_reason: null,
		}

		const task = parseTaskRow(row)
		expect(task.tags).toEqual(['urgent'])
	})
})

describe('parseSignalRow', () => {
	it('parses raw database row', () => {
		const row = {
			id: '01945b5e-7000-7000-8000-000000000002',
			task_id: '01945b5e-7000-7000-8000-000000000001',
			timestamp: '2025-01-22T12:00:00Z',
			kind: 'reflection',
			payload: '{"text":"anxious","moment":"before"}',
		}

		const signal = parseSignalRow(row)
		expect(signal.payload).toEqual({ text: 'anxious', moment: 'before' })
	})
})
