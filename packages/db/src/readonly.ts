/**
 * Read-only wrapper for libsql Client.
 *
 * Provides a Client-like interface that only exposes read operations,
 * blocking any attempt to execute write queries.
 *
 * TODO: Replace this wrapper with native `?mode=ro` URL parameter once
 * https://github.com/tursodatabase/libsql-client-ts/issues/338 is resolved.
 * The native readonly mode will provide SQLite-level enforcement, which is
 * more robust than application-level blocking.
 */

import type {
	Client,
	InStatement,
	Replicated,
	ResultSet,
	Transaction,
} from '@libsql/client'

/** Error thrown when a write operation is attempted on a readonly client */
export class ReadonlyViolationError extends Error {
	constructor(operation: string) {
		super(`Write operation "${operation}" not allowed on readonly connection`)
		this.name = 'ReadonlyViolationError'
	}
}

/** SQL patterns that indicate write operations */
const WRITE_PATTERNS = [
	/^\s*alter\b/i,
	/^\s*attach\b/i,
	/^\s*create\b/i,
	/^\s*delete\b/i,
	/^\s*detach\b/i,
	/^\s*drop\b/i,
	/^\s*insert\b/i,
	/^\s*pragma\b/i,
	/^\s*reindex\b/i,
	/^\s*update\b/i,
	/^\s*vacuum\b/i,
]

/** Check if a SQL statement is a write operation */
function isWriteStatement(sql: string): boolean {
	return WRITE_PATTERNS.some((pattern) => pattern.test(sql))
}

/** Extract SQL string from InStatement */
function getSql(stmt: InStatement): string {
	return typeof stmt === 'string' ? stmt : stmt.sql
}

/** Validate that a statement is read-only */
function validateReadonly(stmt: InStatement): void {
	const sql = getSql(stmt)
	if (isWriteStatement(sql)) {
		throw new ReadonlyViolationError(sql.trim().split(/\s+/)[0] ?? 'unknown')
	}
}

/**
 * Wraps a libsql Client to only allow read operations.
 *
 * The wrapper validates SQL statements before execution and throws
 * ReadonlyViolationError for any write operations (INSERT, UPDATE, DELETE, etc).
 *
 * @example
 * ```typescript
 * import { createClient } from "@libsql/client";
 * import { createReadonlyClient } from "@tender/db";
 *
 * const client = createClient({ url: "file:data.db" });
 * const readonlyClient = createReadonlyClient(client);
 *
 * // This works
 * await readonlyClient.execute("SELECT * FROM users");
 *
 * // This throws ReadonlyViolationError
 * await readonlyClient.execute("INSERT INTO users (name) VALUES ('alice')");
 * ```
 */
export function createReadonlyClient(client: Client): Client {
	return {
		// Pass through readonly properties
		get closed() {
			return client.closed
		},
		get protocol() {
			return client.protocol
		},

		// Validated execute - checks SQL before running
		async execute(stmt: InStatement): Promise<ResultSet> {
			validateReadonly(stmt)
			return client.execute(stmt)
		},

		// Validated batch - checks all statements before running
		async batch(
			stmts: InStatement[],
			mode?: 'write' | 'read' | 'deferred'
		): Promise<ResultSet[]> {
			// Block if explicitly requesting write mode
			if (mode === 'write') {
				throw new ReadonlyViolationError('batch with write mode')
			}

			// Validate all statements
			for (const stmt of stmts) {
				validateReadonly(stmt)
			}

			// Force read mode for extra safety
			return client.batch(stmts, 'read')
		},

		// Block transaction - transactions can contain writes
		transaction(): Promise<Transaction> {
			return Promise.reject(new ReadonlyViolationError('transaction'))
		},

		// Block executeMultiple - can contain multiple statements including writes
		executeMultiple(): Promise<void> {
			return Promise.reject(new ReadonlyViolationError('executeMultiple'))
		},

		// Block sync - only relevant for write replicas
		sync(): Promise<Replicated> {
			return Promise.reject(new ReadonlyViolationError('sync'))
		},

		// Block migrate - migrations are write operations
		migrate(_stmts: InStatement[]): Promise<ResultSet[]> {
			return Promise.reject(new ReadonlyViolationError('migrate'))
		},

		// Pass through close and reconnect - these don't modify data
		close(): void {
			client.close()
		},

		reconnect(): void {
			client.reconnect()
		},
	}
}
