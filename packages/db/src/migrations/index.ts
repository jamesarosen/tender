/**
 * All database migrations.
 *
 * Exports migrations as a record for use with Kysely's Migrator.
 */

import type { Migration } from 'kysely'
import * as m001 from './001-initial-schema.js'

/** All migrations keyed by name */
export const migrations: Record<string, Migration> = {
	'001-initial-schema': m001,
}
