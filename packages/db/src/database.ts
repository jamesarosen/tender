/**
 * Database initialization utilities.
 */

import { type Client, createClient } from '@libsql/client'
import { Kysely, type MigrationProvider, Migrator } from 'kysely'
import { LibsqlDialect } from 'kysely-libsql'
import { migrations } from './migrations/index.js'
import type { Database } from './schema.js'

/**
 * Migration provider that uses inline migrations.
 */
class InlineMigrationProvider implements MigrationProvider {
	async getMigrations() {
		return migrations
	}
}

/**
 * Creates a Kysely instance from a libsql client.
 */
export function createKysely(client: Client): Kysely<Database> {
	return new Kysely<Database>({
		dialect: new LibsqlDialect({ client }),
	})
}

/** Database connection with both raw client and typed Kysely instance */
export interface DatabaseConnection {
	/** Raw libsql client for direct queries */
	client: Client
	/** Kysely instance for type-safe queries */
	db: Kysely<Database>
	/** Close the database connection */
	close: () => void
}

/**
 * Creates a database connection with migrations applied.
 *
 * @param url - Database URL (e.g., 'file:./data.db' or ':memory:')
 * @returns Connection with both raw client and typed Kysely instance
 */
export async function createDatabase(url: string): Promise<DatabaseConnection> {
	const client = createClient({ url })

	// Enable foreign key enforcement (off by default in SQLite)
	await client.execute('PRAGMA foreign_keys = ON')

	const db = createKysely(client)
	const migrator = new Migrator({
		db,
		provider: new InlineMigrationProvider(),
	})

	const { error } = await migrator.migrateToLatest()
	if (error) {
		client.close()
		throw error
	}

	return {
		client,
		db,
		close() {
			client.close()
		},
	}
}
