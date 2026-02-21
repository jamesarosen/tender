/**
 * MCP server entry point.
 *
 * Connects to the Tender database and exposes read-only tools
 * and resources via stdio transport.
 */

import { getDatabasePath } from '@tender/config'
import { openDatabase, createReadonlyClient } from '@tender/db'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerResources } from './resources.js'
import { registerQueryTool } from './tools/query.js'

const LOG_PREFIX = '[tender-mcp]'

async function main(): Promise<void> {
	const dbPath = getDatabasePath()

	// All logging goes to stderr — stdout is the MCP protocol wire
	console.error(`${LOG_PREFIX} starting, db: ${dbPath}`)

	let connection
	try {
		connection = await openDatabase(dbPath)
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		console.error(
			`${LOG_PREFIX} failed to open database at ${dbPath}: ${message}`
		)
		process.exit(1)
	}
	console.error(`${LOG_PREFIX} database ready`)

	const server = new McpServer({
		name: 'tender',
		version: '0.0.1',
	})

	const readonlyClient = createReadonlyClient(connection.client)
	const getClient = () => readonlyClient
	registerQueryTool(server, getClient)
	registerResources(server, getClient)

	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error(`${LOG_PREFIX} connected via stdio`)

	const shutdown = () => {
		console.error(`${LOG_PREFIX} shutting down`)
		server.close().finally(() => {
			connection.close()
			process.exit(0)
		})
	}
	process.on('SIGTERM', shutdown)
	process.on('SIGINT', shutdown)
}

main().catch((err) => {
	console.error(`${LOG_PREFIX} fatal:`, err)
	process.exit(1)
})
