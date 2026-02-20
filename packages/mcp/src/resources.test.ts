import { describe, expect, afterEach } from 'vitest'
import { test } from '@tender/db/test-setup'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { registerResources } from './resources.js'

async function setup(getClient: () => import('@libsql/client').Client) {
	const server = new McpServer({ name: 'test', version: '0.0.1' })
	registerResources(server, getClient)

	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
	const client = new Client({ name: 'test-client', version: '0.0.1' })
	await server.connect(serverTransport)
	await client.connect(clientTransport)

	return { server, client }
}

describe('tender://schema resource', () => {
	let mcpClient: Client | undefined

	afterEach(async () => {
		if (mcpClient) {
			await mcpClient.close()
			mcpClient = undefined
		}
	})

	test('returns CREATE TABLE statements', async ({ client: dbClient }) => {
		const { client } = await setup(() => dbClient)
		mcpClient = client

		const result = await client.readResource({ uri: 'tender://schema' })
		const text = (result.contents as Array<{ uri: string; text: string }>)[0].text

		expect(text).toContain('CREATE TABLE templates')
		expect(text).toContain('CREATE TABLE tasks')
		expect(text).toContain('CREATE TABLE signals')
	})

	test('includes indexes', async ({ client: dbClient }) => {
		const { client } = await setup(() => dbClient)
		mcpClient = client

		const result = await client.readResource({ uri: 'tender://schema' })
		const text = (result.contents as Array<{ uri: string; text: string }>)[0].text

		expect(text).toContain('CREATE INDEX')
	})
})
