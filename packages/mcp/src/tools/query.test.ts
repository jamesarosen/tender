import { describe, expect, afterEach } from 'vitest'
import { test } from '@tender/db/test-setup'
import { createReadonlyClient } from '@tender/db'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { registerQueryTool } from './query.js'

async function setup(getClient: () => import('@libsql/client').Client) {
	const server = new McpServer({ name: 'test', version: '0.0.1' })
	const readonlyClient = createReadonlyClient(getClient())
	registerQueryTool(server, () => readonlyClient)

	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
	const client = new Client({ name: 'test-client', version: '0.0.1' })
	await server.connect(serverTransport)
	await client.connect(clientTransport)

	return { server, client }
}

describe('tender_query', () => {
	let mcpClient: Client | undefined

	afterEach(async () => {
		if (mcpClient) {
			await mcpClient.close()
			mcpClient = undefined
		}
	})

	test('returns rows for a valid SELECT', async ({ client: dbClient }) => {
		await dbClient.execute(
			"INSERT INTO tasks (id, description, tags, created_at) VALUES ('t1', 'test task', '[]', '2026-01-01T00:00:00Z')"
		)
		const { client } = await setup(() => dbClient)
		mcpClient = client

		const result = await client.callTool({
			name: 'tender_query',
			arguments: { sql: 'SELECT id, description FROM tasks' },
		})

		expect(result.isError).toBeFalsy()
		const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text)
		expect(parsed.rowCount).toBe(1)
		expect(parsed.rows[0]).toEqual({ id: 't1', description: 'test task' })
	})

	test('returns columns in response', async ({ client: dbClient }) => {
		const { client } = await setup(() => dbClient)
		mcpClient = client

		const result = await client.callTool({
			name: 'tender_query',
			arguments: { sql: 'SELECT 1 as a, 2 as b' },
		})

		const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text)
		expect(parsed.columns).toEqual(['a', 'b'])
	})

	test('blocks write operations', async ({ client: dbClient }) => {
		const { client } = await setup(() => dbClient)
		mcpClient = client

		const result = await client.callTool({
			name: 'tender_query',
			arguments: { sql: "DELETE FROM tasks WHERE id = 'x'" },
		})

		expect(result.isError).toBe(true)
		const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text)
		expect(parsed.error).toMatch(/write operation/i)
		expect(parsed.hint).toBeDefined()
	})

	test('returns error for invalid SQL', async ({ client: dbClient }) => {
		const { client } = await setup(() => dbClient)
		mcpClient = client

		const result = await client.callTool({
			name: 'tender_query',
			arguments: { sql: 'SELECT * FROM nonexistent_table' },
		})

		expect(result.isError).toBe(true)
		const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text)
		expect(parsed.error).toBeDefined()
		expect(parsed.hint).toMatch(/tender:\/\/schema/)
	})

	test('supports CTEs', async ({ client: dbClient }) => {
		await dbClient.execute(
			"INSERT INTO tasks (id, description, tags, created_at) VALUES ('t1', 'task one', '[]', '2026-01-01T00:00:00Z')"
		)
		await dbClient.execute(
			"INSERT INTO tasks (id, description, tags, created_at) VALUES ('t2', 'task two', '[]', '2026-01-01T00:00:00Z')"
		)

		const { client } = await setup(() => dbClient)
		mcpClient = client

		const result = await client.callTool({
			name: 'tender_query',
			arguments: {
				sql: 'WITH active AS (SELECT * FROM tasks WHERE deleted_at IS NULL) SELECT count(*) as n FROM active',
			},
		})

		expect(result.isError).toBeFalsy()
		const parsed = JSON.parse((result.content as Array<{ text: string }>)[0].text)
		expect(parsed.rows[0]).toEqual({ n: 2 })
	})
})
