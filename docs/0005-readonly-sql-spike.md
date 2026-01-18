# Spike: Read-Only SQL Tool

## Goal

Explore whether we can create a second, readonly drizzle/libsql connection to use exclusively for the agent's `queryDatabase` tool, ensuring the agent cannot accidentally modify data.

## Background

The agent needs a `queryDatabase` tool for flexible prioritization queries. Per the architecture:

- Timeout: 5s
- Row limit: 1000
- Must be read-only (SELECT only)

## Research Questions

1. **Does libsql support readonly mode in the URL?**
2. **Can drizzle wrap a readonly libsql client?**
3. **What's the best enforcement layer?**

## Findings

### libsql Client Options

The `@libsql/client` does not yet support a `?mode=ro` URL parameter like standard SQLite. See [Support readonly connections](https://github.com/tursodatabase/libsql-client-ts/issues/338).

However, it does provide:

1. **Transaction mode on batch operations:**

   ```typescript
   await client.batch(['SELECT * FROM tasks'], 'read') // "read" | "write" | "deferred"
   ```

2. **No connection-level readonly mode** — The client is designed for both read and write operations.

### Enforcement Options

| Layer       | Approach               | Pros                          | Cons                           |
| ----------- | ---------------------- | ----------------------------- | ------------------------------ |
| **URL**     | `?mode=ro`             | SQLite-native, bulletproof    | Not supported by libsql client |
| **Client**  | Separate libsql client | Isolation at connection level | Still relies on discipline     |
| **Drizzle** | Readonly wrapper/proxy | Type-safe, clear API          | Extra abstraction              |
| **Tool**    | SQL validation         | Simple, explicit              | Regex can be tricked           |
| **DB**      | SQLite user/role       | True enforcement              | SQLite doesn't have users      |

### Recommended Approach: Layered Defense, then mode=ro

**Primary: Application-level readonly wrapper**

```typescript
// packages/db/src/readonly.ts
import { createClient } from '@libsql/client'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

export function createReadonlyDb(url: string): LibSQLDatabase<typeof schema> {
	const client = createClient({ url })
	const db = drizzle(client, { schema })

	// Return a proxy that only exposes read operations
	return new Proxy(db, {
		get(target, prop) {
			// Block write operations
			const blocked = ['insert', 'update', 'delete', 'transaction']
			if (blocked.includes(prop as string)) {
				throw new Error(
					`Write operation "${String(prop)}" not allowed on readonly connection`
				)
			}
			return target[prop as keyof typeof target]
		},
	})
}
```

**Secondary: SQL validation in tool**

```typescript
// packages/agent/src/tools/query.ts
function validateReadonlySQL(sql: string): void {
	const normalized = sql.trim().toLowerCase()

	// Must start with SELECT or WITH (for CTEs)
	if (!normalized.startsWith('select') && !normalized.startsWith('with')) {
		throw new Error('Only SELECT queries allowed')
	}

	// Block dangerous patterns (even in subqueries/CTEs)
	const dangerous = [
		/\binsert\b/i,
		/\bupdate\b/i,
		/\bdelete\b/i,
		/\bdrop\b/i,
		/\balter\b/i,
		/\bcreate\b/i,
		/\battach\b/i,
		/\bdetach\b/i,
		/\bpragma\b/i,
		/\breindex\b/i,
		/\bvacuum\b/i,
		/\banalyze\b/i, // Can be slow
	]

	for (const pattern of dangerous) {
		if (pattern.test(sql)) {
			throw new Error(`Dangerous SQL pattern detected: ${pattern}`)
		}
	}
}
```

## Spike Implementation

### Files to Create

```
packages/db/
├── src/
│   ├── client.ts       # Main read/write client
│   ├── readonly.ts     # Readonly client wrapper
│   └── index.ts        # Exports both

packages/agent/
├── src/
│   └── tools/
│       └── query.ts    # queryDatabase tool
```

### Minimal Code to Validate

```typescript
// spike.ts - Run with: npx tsx spike.ts

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sql } from 'drizzle-orm'

async function main() {
	// Create two clients pointing to same DB
	const rwClient = createClient({ url: 'file:test.db' })
	const roClient = createClient({ url: 'file:test.db' })

	const rwDb = drizzle(rwClient)
	const roDb = drizzle(roClient)

	// Setup
	await rwDb.run(
		sql`CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)`
	)
	await rwDb.run(sql`INSERT OR IGNORE INTO test (id, name) VALUES (1, 'alice')`)

	// Test 1: Read works on both
	console.log('RW read:', await rwDb.all(sql`SELECT * FROM test`))
	console.log('RO read:', await roDb.all(sql`SELECT * FROM test`))

	// Test 2: Create readonly proxy
	const readonlyDb = new Proxy(roDb, {
		get(target, prop) {
			const blocked = ['run', 'insert', 'update', 'delete']
			if (blocked.includes(prop as string)) {
				return () => {
					throw new Error(
						`Write operation "${String(prop)}" blocked on readonly connection`
					)
				}
			}
			return target[prop as keyof typeof target]
		},
	})

	// Test 3: Verify proxy blocks writes
	try {
		await readonlyDb.run(sql`INSERT INTO test (name) VALUES ('bob')`)
		console.log('FAIL: Write should have been blocked')
	} catch (e) {
		console.log('PASS: Write blocked:', (e as Error).message)
	}

	// Test 4: Verify proxy allows reads
	console.log(
		'Readonly proxy read:',
		await readonlyDb.all(sql`SELECT * FROM test`)
	)

	// Cleanup
	rwClient.close()
	roClient.close()
}

main().catch(console.error)
```

## Success Criteria

- [ ] Readonly proxy blocks `run`, `insert`, `update`, `delete` at runtime
- [ ] Readonly proxy allows `all`, `get`, `values` for queries
- [ ] SQL validation catches dangerous patterns
- [ ] Two clients can coexist on the same file
- [ ] Performance is acceptable (no measurable overhead)

## Out of Scope

- Full tool implementation with timeout/row limit (that's the actual feature)
- System prompt additions for schema documentation
- Integration with agent framework

## Next Steps After Spike

If successful:

1. Move `createReadonlyDb` to `packages/db/src/readonly.ts`
2. Implement full `queryDatabase` tool with timeout, row limit, error fallback
3. Add schema documentation to system prompt
4. Write tests for SQL validation edge cases

## Alternative: libsql Batch "read" Mode

Another option is using libsql's batch API with `"read"` mode:

```typescript
const results = await client.batch([{ sql: userQuery, args: [] }], 'read')
```

This tells SQLite to use a read transaction. However:

- It doesn't prevent `INSERT`/`UPDATE` in the SQL itself (SQLite will error at runtime)
- The error message may be confusing
- No compile-time or static analysis protection

**Verdict:** Useful as additional defense, but not sufficient alone.

## Risks & Mitigations

| Risk                               | Mitigation                                          |
| ---------------------------------- | --------------------------------------------------- |
| SQL injection through CTE/subquery | Block dangerous keywords everywhere, not just start |
| Slow queries DoS                   | Add timeout (handled in tool, not spike)            |
| Large result sets                  | Add row limit (handled in tool, not spike)          |
| Proxy overhead                     | Benchmark (likely negligible for query workloads)   |
