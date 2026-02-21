/**
 * tender_query tool — read-only SQL against the Tender database.
 */

import type { Client } from '@libsql/client'
import { ReadonlyViolationError } from '@tender/db'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

const TIMEOUT_MS = 5_000
const ROW_LIMIT = 1_000
const LOG_PREFIX = '[tender-mcp]'

const TOOL_DESCRIPTION = [
	'Execute read-only SQL against the Tender database.',
	`Supports SELECT and WITH (CTEs). Timeout: ${TIMEOUT_MS / 1000}s, row limit: ${ROW_LIMIT}.`,
	"Returns results as JSON. Use this for ad-hoc analysis, debugging, and any read that doesn't have a dedicated tool.",
	'',
	'IMPORTANT: tags, recurrence, and payload columns store JSON-encoded strings.',
	'Use json_each() or json_extract() to query them:',
	"  WHERE EXISTS (SELECT 1 FROM json_each(tags) WHERE value = 'work')",
	"  SELECT json_extract(recurrence, '$.type') FROM tasks",
].join('\n')

export function registerQueryTool(
	server: McpServer,
	getClient: () => Client
): void {
	server.registerTool(
		'tender_query',
		{
			title: 'Query Tender Database',
			description: TOOL_DESCRIPTION,
			inputSchema: z.object({
				sql: z
					.string()
					.describe('SQL query to execute. Must be a SELECT or WITH statement.'),
			}),
		},
		async ({ sql }) => {
			const client = getClient()
			const start = Date.now()
			let timer: ReturnType<typeof setTimeout> | undefined

			try {
				const executePromise = client.execute(sql)
				// Prevent unhandled rejection if execute finishes after timeout.
				// libsql has no cancellation API, so the query continues running
				// even after the timeout fires.
				executePromise.catch(() => {})

				const result = await Promise.race([
					executePromise,
					new Promise<never>((_, reject) => {
						timer = setTimeout(() => {
							console.error(LOG_PREFIX, 'query timeout', {
								sql: sql.slice(0, 80),
							})
							reject(new Error(`Query timed out after ${TIMEOUT_MS / 1000}s`))
						}, TIMEOUT_MS)
					}),
				])
				clearTimeout(timer)

				const rows = result.rows.slice(0, ROW_LIMIT)
				const truncated = result.rows.length > ROW_LIMIT

				console.error(LOG_PREFIX, 'query ok', {
					rows: rows.length,
					ms: Date.now() - start,
					truncated,
				})

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									columns: result.columns,
									rows,
									rowCount: rows.length,
									...(truncated && {
										truncated: true,
										hint: `Results truncated to ${ROW_LIMIT} rows. Add a LIMIT clause to your query.`,
									}),
								},
								null,
								2
							),
						},
					],
				}
			} catch (err) {
				clearTimeout(timer)

				if (err instanceof ReadonlyViolationError) {
					console.error(LOG_PREFIX, 'write attempt blocked', {
						sql: sql.slice(0, 80),
					})
					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									error: err.message,
									hint:
										'tender_query only supports SELECT and WITH (CTE) statements. Write operations are not available through the MCP server.',
								}),
							},
						],
						isError: true,
					}
				}
				const message = err instanceof Error ? err.message : 'Unknown error'
				console.error(LOG_PREFIX, 'query failed', {
					error: message,
					sql: sql.slice(0, 80),
				})
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								error: message,
								hint:
									'Read tender://schema to see available tables and columns. Note: tags, recurrence, and payload are JSON strings — use json_extract() to filter them.',
							}),
						},
					],
					isError: true,
				}
			}
		}
	)
}
