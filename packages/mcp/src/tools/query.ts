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

export function registerQueryTool(
	server: McpServer,
	getClient: () => Client
): void {
	server.registerTool(
		'tender_query',
		{
			title: 'Query Tender Database',
			description: `Execute read-only SQL against the Tender database. Supports SELECT and WITH (CTEs). Timeout: ${TIMEOUT_MS / 1000}s, row limit: ${ROW_LIMIT}. Returns results as JSON. Use this for ad-hoc analysis, debugging, and any read that doesn't have a dedicated tool.`,
			inputSchema: z.object({
				sql: z
					.string()
					.describe('SQL query to execute. Must be a SELECT or WITH statement.'),
			}),
		},
		async ({ sql }) => {
			const client = getClient()
			let timer: ReturnType<typeof setTimeout> | undefined

			try {
				const result = await Promise.race([
					client.execute(sql),
					new Promise<never>((_, reject) => {
						timer = setTimeout(
							() => reject(new Error(`Query timed out after ${TIMEOUT_MS / 1000}s`)),
							TIMEOUT_MS
						)
					}),
				])
				clearTimeout(timer)

				// result.rows is the full set from libsql; we slice after
				const rows = result.rows.slice(0, ROW_LIMIT)
				const truncated = result.rows.length > ROW_LIMIT

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
					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									error: err.message,
									hint:
										'tender_query only supports SELECT and WITH (CTE) statements. Use tender_manage_task or tender_manage_template for write operations.',
								}),
							},
						],
						isError: true,
					}
				}
				const message = err instanceof Error ? err.message : 'Unknown error'
				console.error(`${LOG_PREFIX} query failed: ${message}`, sql.slice(0, 200))
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								error: message,
								hint:
									'Check your SQL syntax. Use tender://schema to see the database schema.',
							}),
						},
					],
					isError: true,
				}
			}
		}
	)
}
