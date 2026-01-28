import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { render } from 'ink'
import React from 'react'
import {
	loadResolvedConfig,
	getDatabasePath,
	type ResolvedTenderConfig,
} from '@tender/config'
import { createDatabase, type DatabaseConnection } from '@tender/db'
import type { LlmAvailabilityInput } from '@tender/agent'
import { App } from '@tender/tui'

async function ensureDirectoryExists(filePath: string): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true })
}

async function checkFirstRun(conn: DatabaseConnection): Promise<boolean> {
	const result = await conn.db
		.selectFrom('tasks')
		.select((eb) => eb.fn.countAll<number>().as('count'))
		.executeTakeFirstOrThrow()

	return Number(result.count) === 0
}

function buildAvailabilityInput(
	config: ResolvedTenderConfig
): LlmAvailabilityInput {
	return {
		provider: config.agent.llm,
		apiKey: config.agent.apiKey,
		maxRetries: config.agent.maxRetries,
		baseBackoffMs: config.agent.baseBackoffMs,
		maxBackoffMs: config.agent.maxBackoffMs,
		rateLimitDefaultMs: config.agent.rateLimitDefaultMs,
	}
}

export async function run(): Promise<void> {
	// Load configuration
	const config = await loadResolvedConfig()

	// Initialize database
	const dbPath = getDatabasePath()
	await ensureDirectoryExists(dbPath)
	const conn = await createDatabase(`file:${dbPath}`)

	// Check if this is first run
	const isFirstRun = await checkFirstRun(conn)

	// Build availability input
	const availabilityInput = buildAvailabilityInput(config)

	// Render the app
	const { waitUntilExit } = render(
		React.createElement(App, {
			db: conn.db,
			availabilityInput,
			isFirstRun,
		})
	)

	// Wait for exit and cleanup
	try {
		await waitUntilExit()
	} finally {
		conn.close()
	}
}
