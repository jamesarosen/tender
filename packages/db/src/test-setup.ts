/**
 * Vitest test fixtures for database tests.
 *
 * Provides a fresh database connection for each test via fixtures.
 *
 * Usage:
 * ```ts
 * import { describe, expect } from 'vitest'
 * import { test } from './test-setup.js'
 *
 * describe('my tests', () => {
 *   test('uses database', async ({ client }) => {
 *     await client.execute({ sql: '...', args: [] })
 *   })
 * })
 * ```
 */

import { randomUUID } from 'node:crypto'
import { copyFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { Client } from '@libsql/client'
import { createClient } from '@libsql/client'
import type { Kysely } from 'kysely'
import { test as base } from 'vitest'
import { createDatabase, createKysely } from './database.js'
import type { Database } from './schema.js'

/** Test fixtures available in database tests */
export interface DbFixtures {
	/** Raw libsql client for direct queries */
	client: Client
	/** Kysely instance for type-safe queries */
	db: Kysely<Database>
}

// Template database path (created once, copied for each test)
let templatePath: string | null = null

async function getTemplatePath(): Promise<string> {
	if (!templatePath) {
		templatePath = join(tmpdir(), `tender-test-template-${randomUUID()}.db`)
		const conn = await createDatabase(`file:${templatePath}`)
		conn.close()
	}
	return templatePath
}

/**
 * Extended test function that provides database fixtures.
 *
 * Each test gets a fresh database copy with migrations applied.
 *
 * @todo: once libsql supports the `backup` API that SQLite has, this can
 * move to all in-memory:
 *     const source = await createDatabase(':memory:')
 *     const clone = new Database(':memory:')
 *     await source.backup(clone)
 */
export const test = base.extend<DbFixtures>({
	// eslint-disable-next-line no-empty-pattern
	client: async ({}, use) => {
		const template = await getTemplatePath()
		const testPath = join(tmpdir(), `tender-test-${randomUUID()}.db`)
		await copyFile(template, testPath)

		const client = createClient({ url: `file:${testPath}` })
		await client.execute('PRAGMA foreign_keys = ON')

		await use(client)

		client.close()
		await unlink(testPath).catch(() => {})
	},

	db: async ({ client }, use) => {
		const db = createKysely(client)
		await use(db)
	},
})

export { describe, expect, beforeEach, afterEach } from 'vitest'
