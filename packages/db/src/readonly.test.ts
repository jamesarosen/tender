import { createClient } from '@libsql/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createReadonlyClient, ReadonlyViolationError } from './readonly.js'

describe('createReadonlyClient', () => {
	let client: ReturnType<typeof createClient>
	let readonlyClient: ReturnType<typeof createReadonlyClient>

	beforeEach(async () => {
		client = createClient({ url: ':memory:' })
		readonlyClient = createReadonlyClient(client)

		// Set up test table using the underlying client
		await client.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')
		await client.execute("INSERT INTO users (id, name) VALUES (1, 'alice')")
		await client.execute("INSERT INTO users (id, name) VALUES (2, 'bob')")
	})

	afterEach(() => {
		client.close()
	})

	describe('execute', () => {
		it('allows SELECT queries', async () => {
			const result = await readonlyClient.execute('SELECT * FROM users')
			expect(result.rows).toHaveLength(2)
			expect(result.rows[0]).toEqual({ id: 1, name: 'alice' })
		})

		it('allows SELECT with parameters', async () => {
			const result = await readonlyClient.execute({
				sql: 'SELECT * FROM users WHERE id = ?',
				args: [1],
			})
			expect(result.rows).toHaveLength(1)
			expect(result.rows[0]).toEqual({ id: 1, name: 'alice' })
		})

		it('allows SELECT with named parameters', async () => {
			const result = await readonlyClient.execute({
				sql: 'SELECT * FROM users WHERE name = :name',
				args: { name: 'bob' },
			})
			expect(result.rows).toHaveLength(1)
			expect(result.rows[0]).toEqual({ id: 2, name: 'bob' })
		})

		it('allows WITH (CTE) queries', async () => {
			const result = await readonlyClient.execute(`
        WITH user_count AS (SELECT COUNT(*) as cnt FROM users)
        SELECT * FROM user_count
      `)
			expect(result.rows[0]).toEqual({ cnt: 2 })
		})

		it('allows SELECT with SQL keywords in string literals', async () => {
			await client.execute(
				"INSERT INTO users (id, name) VALUES (3, 'Tommy Insert')"
			)
			const result = await readonlyClient.execute(
				"SELECT * FROM users WHERE name LIKE '%insert%'"
			)
			expect(result.rows).toHaveLength(1)
			expect(result.rows[0]).toEqual({ id: 3, name: 'Tommy Insert' })
		})

		it('blocks INSERT statements', async () => {
			await expect(
				readonlyClient.execute("INSERT INTO users (name) VALUES ('charlie')")
			).rejects.toThrow(ReadonlyViolationError)
		})

		it('blocks UPDATE statements', async () => {
			await expect(
				readonlyClient.execute("UPDATE users SET name = 'updated' WHERE id = 1")
			).rejects.toThrow(ReadonlyViolationError)
		})

		it('blocks DELETE statements', async () => {
			await expect(
				readonlyClient.execute('DELETE FROM users WHERE id = 1')
			).rejects.toThrow(ReadonlyViolationError)
		})

		it('blocks DROP statements', async () => {
			await expect(readonlyClient.execute('DROP TABLE users')).rejects.toThrow(
				ReadonlyViolationError
			)
		})

		it('blocks CREATE statements', async () => {
			await expect(
				readonlyClient.execute('CREATE TABLE other (id INTEGER)')
			).rejects.toThrow(ReadonlyViolationError)
		})

		it('blocks ALTER statements', async () => {
			await expect(
				readonlyClient.execute('ALTER TABLE users ADD COLUMN email TEXT')
			).rejects.toThrow(ReadonlyViolationError)
		})

		it('blocks PRAGMA statements', async () => {
			await expect(
				readonlyClient.execute('PRAGMA table_info(users)')
			).rejects.toThrow(ReadonlyViolationError)
		})

		it('blocks statements with leading whitespace', async () => {
			await expect(
				readonlyClient.execute("  \n  INSERT INTO users (name) VALUES ('x')")
			).rejects.toThrow(ReadonlyViolationError)
		})

		it('is case-insensitive', async () => {
			await expect(
				readonlyClient.execute("INSERT INTO users (name) VALUES ('x')")
			).rejects.toThrow(ReadonlyViolationError)

			await expect(
				readonlyClient.execute("insert INTO users (name) VALUES ('x')")
			).rejects.toThrow(ReadonlyViolationError)

			await expect(
				readonlyClient.execute("Insert INTO users (name) VALUES ('x')")
			).rejects.toThrow(ReadonlyViolationError)
		})
	})

	describe('batch', () => {
		it('allows batch of SELECT queries', async () => {
			const results = await readonlyClient.batch([
				'SELECT COUNT(*) as cnt FROM users',
				'SELECT * FROM users WHERE id = 1',
			])
			expect(results).toHaveLength(2)
			expect(results[0]?.rows[0]).toEqual({ cnt: 2 })
			expect(results[1]?.rows[0]).toEqual({ id: 1, name: 'alice' })
		})

		it('blocks batch with any write statement', async () => {
			await expect(
				readonlyClient.batch([
					'SELECT * FROM users',
					"INSERT INTO users (name) VALUES ('x')",
				])
			).rejects.toThrow(ReadonlyViolationError)
		})

		it('blocks batch with explicit write mode', async () => {
			await expect(
				readonlyClient.batch(['SELECT * FROM users'], 'write')
			).rejects.toThrow(ReadonlyViolationError)
		})

		it('allows read mode explicitly', async () => {
			const results = await readonlyClient.batch(['SELECT * FROM users'], 'read')
			expect(results).toHaveLength(1)
		})
	})

	describe('transaction', () => {
		it('blocks transaction creation', async () => {
			await expect(readonlyClient.transaction()).rejects.toThrow(
				ReadonlyViolationError
			)
		})
	})

	describe('executeMultiple', () => {
		it('blocks executeMultiple', async () => {
			await expect(
				readonlyClient.executeMultiple('SELECT 1; SELECT 2')
			).rejects.toThrow(ReadonlyViolationError)
		})
	})

	describe('sync', () => {
		it('blocks sync', async () => {
			await expect(readonlyClient.sync()).rejects.toThrow(ReadonlyViolationError)
		})
	})

	describe('migrate', () => {
		it('blocks migrate', async () => {
			await expect(readonlyClient.migrate(['SELECT 1'])).rejects.toThrow(
				ReadonlyViolationError
			)
		})
	})

	describe('client lifecycle', () => {
		it('passes through closed property', () => {
			expect(readonlyClient.closed).toBe(false)
			readonlyClient.close()
			expect(readonlyClient.closed).toBe(true)
		})

		it('passes through protocol property', () => {
			// In-memory databases use "file" protocol
			expect(readonlyClient.protocol).toBe('file')
		})
	})

	describe('ReadonlyViolationError', () => {
		it('includes the operation in the message', async () => {
			try {
				await readonlyClient.execute("INSERT INTO users (name) VALUES ('x')")
				expect.fail('Should have thrown')
			} catch (e) {
				expect(e).toBeInstanceOf(ReadonlyViolationError)
				expect((e as Error).message).toContain('INSERT')
			}
		})

		it('has correct error name', async () => {
			try {
				await readonlyClient.execute('DELETE FROM users')
				expect.fail('Should have thrown')
			} catch (e) {
				expect((e as Error).name).toBe('ReadonlyViolationError')
			}
		})
	})
})
