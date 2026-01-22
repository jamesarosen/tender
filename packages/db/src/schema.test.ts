/**
 * Tests for database schema constraints.
 *
 * These tests verify that JSON columns enforce validity via CHECK constraints.
 */

import { describe, expect, test } from './test-setup.js'

describe('templates', () => {
	describe('tags column', () => {
		test('accepts valid JSON array', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO templates (id, description, recurrence, tags, created_at)
				      VALUES (?, ?, ?, ?, ?)`,
				args: [
					't1',
					'Test template',
					'{"type":"interval","duration":"P1W"}',
					'["kitchen", "maintenance"]',
					'2025-01-01T00:00:00Z',
				],
			})

			const result = await client.execute({
				sql: 'SELECT tags FROM templates WHERE id = ?',
				args: ['t1'],
			})
			expect(result.rows[0]?.['tags']).toBe('["kitchen", "maintenance"]')
		})

		test('accepts empty JSON array', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO templates (id, description, recurrence, tags, created_at)
				      VALUES (?, ?, ?, ?, ?)`,
				args: [
					't1',
					'Test template',
					'{"type":"interval","duration":"P1W"}',
					'[]',
					'2025-01-01T00:00:00Z',
				],
			})

			const result = await client.execute({
				sql: 'SELECT tags FROM templates WHERE id = ?',
				args: ['t1'],
			})
			expect(result.rows[0]?.['tags']).toBe('[]')
		})

		test('defaults to empty array', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO templates (id, description, recurrence, created_at)
				      VALUES (?, ?, ?, ?)`,
				args: [
					't1',
					'Test template',
					'{"type":"interval","duration":"P1W"}',
					'2025-01-01T00:00:00Z',
				],
			})

			const result = await client.execute({
				sql: 'SELECT tags FROM templates WHERE id = ?',
				args: ['t1'],
			})
			expect(result.rows[0]?.['tags']).toBe('[]')
		})

		test('rejects plain text', async ({ client }) => {
			await expect(
				client.execute({
					sql: `INSERT INTO templates (id, description, recurrence, tags, created_at)
					      VALUES (?, ?, ?, ?, ?)`,
					args: [
						't1',
						'Test template',
						'{"type":"interval","duration":"P1W"}',
						'not json',
						'2025-01-01T00:00:00Z',
					],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})

		test('rejects malformed JSON', async ({ client }) => {
			await expect(
				client.execute({
					sql: `INSERT INTO templates (id, description, recurrence, tags, created_at)
					      VALUES (?, ?, ?, ?, ?)`,
					args: [
						't1',
						'Test template',
						'{"type":"interval","duration":"P1W"}',
						'[unclosed',
						'2025-01-01T00:00:00Z',
					],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})

		test('rejects invalid JSON on update', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO templates (id, description, recurrence, created_at) VALUES (?, ?, ?, ?)`,
				args: [
					't1',
					'Test',
					'{"type":"interval","duration":"P1W"}',
					'2025-01-01T00:00:00Z',
				],
			})

			await expect(
				client.execute({
					sql: `UPDATE templates SET tags = ? WHERE id = ?`,
					args: ['invalid', 't1'],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})
	})

	describe('recurrence column', () => {
		test('accepts valid JSON object', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO templates (id, description, recurrence, created_at)
				      VALUES (?, ?, ?, ?)`,
				args: [
					't1',
					'Test template',
					'{"type":"interval","duration":"P1W"}',
					'2025-01-01T00:00:00Z',
				],
			})

			const result = await client.execute({
				sql: 'SELECT recurrence FROM templates WHERE id = ?',
				args: ['t1'],
			})
			expect(result.rows[0]?.['recurrence']).toBe(
				'{"type":"interval","duration":"P1W"}'
			)
		})

		test('rejects null', async ({ client }) => {
			await expect(
				client.execute({
					sql: `INSERT INTO templates (id, description, recurrence, created_at)
					      VALUES (?, ?, ?, ?)`,
					args: ['t1', 'Test template', null, '2025-01-01T00:00:00Z'],
				})
			).rejects.toThrow(/NOT NULL constraint failed/)
		})

		test('rejects plain text', async ({ client }) => {
			await expect(
				client.execute({
					sql: `INSERT INTO templates (id, description, recurrence, created_at)
					      VALUES (?, ?, ?, ?)`,
					args: ['t1', 'Test template', 'P1W', '2025-01-01T00:00:00Z'],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})

		test('rejects invalid JSON on update', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO templates (id, description, recurrence, created_at) VALUES (?, ?, ?, ?)`,
				args: [
					't1',
					'Test',
					'{"type":"interval","duration":"P1W"}',
					'2025-01-01T00:00:00Z',
				],
			})

			await expect(
				client.execute({
					sql: `UPDATE templates SET recurrence = ? WHERE id = ?`,
					args: ['invalid', 't1'],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})
	})

	describe('timestamp columns', () => {
		test('accepts valid ISO8601 datetime', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO templates (id, description, recurrence, created_at, archived_at)
				      VALUES (?, ?, ?, ?, ?)`,
				args: [
					't1',
					'Test',
					'{"type":"interval","duration":"P1W"}',
					'2025-01-22T12:00:00Z',
					'2025-06-01T00:00:00Z',
				],
			})

			const result = await client.execute({
				sql: 'SELECT created_at, archived_at FROM templates WHERE id = ?',
				args: ['t1'],
			})
			expect(result.rows[0]?.['created_at']).toBe('2025-01-22T12:00:00Z')
			expect(result.rows[0]?.['archived_at']).toBe('2025-06-01T00:00:00Z')
		})

		test('rejects invalid created_at', async ({ client }) => {
			await expect(
				client.execute({
					sql: `INSERT INTO templates (id, description, recurrence, created_at)
					      VALUES (?, ?, ?, ?)`,
					args: ['t1', 'Test', '{"type":"interval","duration":"P1W"}', 'not-a-date'],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})

		test('rejects invalid archived_at', async ({ client }) => {
			await expect(
				client.execute({
					sql: `INSERT INTO templates (id, description, recurrence, created_at, archived_at)
					      VALUES (?, ?, ?, ?, ?)`,
					args: [
						't1',
						'Test',
						'{"type":"interval","duration":"P1W"}',
						'2025-01-01T00:00:00Z',
						'garbage',
					],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})
	})
})

describe('tasks', () => {
	describe('tags column', () => {
		test('accepts valid JSON array', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, tags, created_at)
				      VALUES (?, ?, ?, ?)`,
				args: ['task1', 'Test task', '["urgent"]', '2025-01-01T00:00:00Z'],
			})

			const result = await client.execute({
				sql: 'SELECT tags FROM tasks WHERE id = ?',
				args: ['task1'],
			})
			expect(result.rows[0]?.['tags']).toBe('["urgent"]')
		})

		test('defaults to empty array', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, created_at)
				      VALUES (?, ?, ?)`,
				args: ['task1', 'Test task', '2025-01-01T00:00:00Z'],
			})

			const result = await client.execute({
				sql: 'SELECT tags FROM tasks WHERE id = ?',
				args: ['task1'],
			})
			expect(result.rows[0]?.['tags']).toBe('[]')
		})

		test('rejects plain text', async ({ client }) => {
			await expect(
				client.execute({
					sql: `INSERT INTO tasks (id, description, tags, created_at)
					      VALUES (?, ?, ?, ?)`,
					args: ['task1', 'Test task', '{invalid}', '2025-01-01T00:00:00Z'],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})

		test('rejects invalid JSON on update', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, created_at) VALUES (?, ?, ?)`,
				args: ['task1', 'Test', '2025-01-01T00:00:00Z'],
			})

			await expect(
				client.execute({
					sql: `UPDATE tasks SET tags = ? WHERE id = ?`,
					args: ['invalid', 'task1'],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})
	})
})

describe('signals', () => {
	describe('payload column', () => {
		test('accepts valid JSON object', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, created_at) VALUES (?, ?, ?)`,
				args: ['task1', 'Test task', '2025-01-01T00:00:00Z'],
			})

			await client.execute({
				sql: `INSERT INTO signals (id, task_id, timestamp, kind, payload)
				      VALUES (?, ?, ?, ?, ?)`,
				args: [
					's1',
					'task1',
					'2025-01-01T00:00:00Z',
					'reflection',
					'{"text":"anxious","moment":"before"}',
				],
			})

			const result = await client.execute({
				sql: 'SELECT payload FROM signals WHERE id = ?',
				args: ['s1'],
			})
			expect(result.rows[0]?.['payload']).toBe(
				'{"text":"anxious","moment":"before"}'
			)
		})

		test('defaults to empty object', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, created_at) VALUES (?, ?, ?)`,
				args: ['task1', 'Test task', '2025-01-01T00:00:00Z'],
			})

			await client.execute({
				sql: `INSERT INTO signals (id, task_id, timestamp, kind)
				      VALUES (?, ?, ?, ?)`,
				args: ['s1', 'task1', '2025-01-01T00:00:00Z', 'completed'],
			})

			const result = await client.execute({
				sql: 'SELECT payload FROM signals WHERE id = ?',
				args: ['s1'],
			})
			expect(result.rows[0]?.['payload']).toBe('{}')
		})

		test('accepts nested JSON', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, created_at) VALUES (?, ?, ?)`,
				args: ['task1', 'Test task', '2025-01-01T00:00:00Z'],
			})

			const payload = JSON.stringify({
				text: 'Waiting for approval',
				prompt: "What's blocking you?",
				metadata: { depth: { nested: true } },
			})

			await client.execute({
				sql: `INSERT INTO signals (id, task_id, timestamp, kind, payload)
				      VALUES (?, ?, ?, ?, ?)`,
				args: ['s1', 'task1', '2025-01-01T00:00:00Z', 'reflection', payload],
			})

			const result = await client.execute({
				sql: 'SELECT payload FROM signals WHERE id = ?',
				args: ['s1'],
			})
			expect(result.rows[0]?.['payload']).toBe(payload)
		})

		test('rejects plain text', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, created_at) VALUES (?, ?, ?)`,
				args: ['task1', 'Test task', '2025-01-01T00:00:00Z'],
			})

			await expect(
				client.execute({
					sql: `INSERT INTO signals (id, task_id, timestamp, kind, payload)
					      VALUES (?, ?, ?, ?, ?)`,
					args: ['s1', 'task1', '2025-01-01T00:00:00Z', 'reflection', 'not-json'],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})

		test('rejects truncated JSON', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, created_at) VALUES (?, ?, ?)`,
				args: ['task1', 'Test task', '2025-01-01T00:00:00Z'],
			})

			await expect(
				client.execute({
					sql: `INSERT INTO signals (id, task_id, timestamp, kind, payload)
					      VALUES (?, ?, ?, ?, ?)`,
					args: [
						's1',
						'task1',
						'2025-01-01T00:00:00Z',
						'reflection',
						'{"truncated":',
					],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})

		test('rejects invalid JSON on update', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, created_at) VALUES (?, ?, ?)`,
				args: ['task1', 'Test task', '2025-01-01T00:00:00Z'],
			})

			await client.execute({
				sql: `INSERT INTO signals (id, task_id, timestamp, kind) VALUES (?, ?, ?, ?)`,
				args: ['s1', 'task1', '2025-01-01T00:00:00Z', 'reflection'],
			})

			await expect(
				client.execute({
					sql: `UPDATE signals SET payload = ? WHERE id = ?`,
					args: ['invalid', 's1'],
				})
			).rejects.toThrow(/CHECK constraint failed/)
		})
	})

	describe('task_id foreign key', () => {
		test('rejects signal with non-existent task_id', async ({ client }) => {
			await expect(
				client.execute({
					sql: `INSERT INTO signals (id, task_id, timestamp, kind)
					      VALUES (?, ?, ?, ?)`,
					args: ['s1', 'nonexistent', '2025-01-01T00:00:00Z', 'reflection'],
				})
			).rejects.toThrow(/FOREIGN KEY constraint failed/)
		})

		test('prevents deleting task with signals', async ({ client }) => {
			await client.execute({
				sql: `INSERT INTO tasks (id, description, created_at) VALUES (?, ?, ?)`,
				args: ['task1', 'Test task', '2025-01-01T00:00:00Z'],
			})

			await client.execute({
				sql: `INSERT INTO signals (id, task_id, timestamp, kind)
				      VALUES (?, ?, ?, ?)`,
				args: ['s1', 'task1', '2025-01-01T00:00:00Z', 'reflection'],
			})

			await expect(
				client.execute({
					sql: `DELETE FROM tasks WHERE id = ?`,
					args: ['task1'],
				})
			).rejects.toThrow(/FOREIGN KEY constraint failed/)
		})
	})
})
