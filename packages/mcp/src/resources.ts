/**
 * MCP resources — ambient context loaded by some clients automatically.
 */

import type { Client } from '@libsql/client'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

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
				'Current Tender database schema — CREATE TABLE statements, indexes, and constraints.',
			mimeType: 'text/plain',
		},
		async (uri) => {
			const client = getClient()
			const result = await client.execute(
				"SELECT sql FROM sqlite_master WHERE type IN ('table', 'index') AND sql IS NOT NULL ORDER BY type DESC, name"
			)
			const ddl = result.rows.map((row) => row.sql).join(';\n\n') + ';'

			return {
				contents: [{ uri: uri.href, text: ddl }],
			}
		}
	)
}
