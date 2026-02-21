/**
 * MCP resources — ambient context loaded by some clients automatically.
 */

import type { Client } from '@libsql/client'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const LOG_PREFIX = '[tender-mcp]'

export function registerResources(
	server: McpServer,
	getClient: () => Client
): void {
	server.registerResource(
		'schema',
		'tender://schema',
		{
			title: 'Database Schema',
			description:
				'Current Tender database schema — CREATE TABLE statements and indexes. Note: tags, recurrence, and payload columns are JSON-encoded strings (TEXT in SQLite).',
			mimeType: 'text/x-sql',
		},
		async (uri) => {
			const client = getClient()

			try {
				const result = await client.execute(
					"SELECT sql FROM sqlite_master WHERE type IN ('table', 'index') AND sql IS NOT NULL AND name NOT LIKE 'kysely_%' ORDER BY type DESC, name"
				)
				const ddl = result.rows.map((row) => row.sql).join(';\n\n') + ';'

				return {
					contents: [{ uri: uri.href, text: ddl }],
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err)
				console.error(LOG_PREFIX, 'schema fetch failed', {
					error: message,
				})
				throw err
			}
		}
	)
}
