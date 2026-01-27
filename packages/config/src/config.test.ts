import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
	loadConfig,
	loadResolvedConfig,
	saveConfig,
	ConfigError,
} from './config.js'

describe('config', () => {
	let tempDir: string
	let configPath: string

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), 'tender-config-test-'))
		configPath = join(tempDir, 'config.json')
	})

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true })
	})

	describe('loadConfig', () => {
		it('returns empty config when file does not exist', async () => {
			const config = await loadConfig(configPath)
			expect(config).toEqual({})
		})

		it('loads and parses valid config', async () => {
			const configData = {
				agent: { llm: 'anthropic', maxRetries: 10 },
				debug: { output: 'file', filePath: '/tmp/debug.log' },
			}
			await writeFile(configPath, JSON.stringify(configData))

			const config = await loadConfig(configPath)

			expect(config).toEqual(configData)
		})

		it('throws ConfigError for invalid JSON', async () => {
			await writeFile(configPath, 'not valid json {{{')

			await expect(loadConfig(configPath)).rejects.toThrow(ConfigError)
			await expect(loadConfig(configPath)).rejects.toThrow('not valid JSON')
		})

		it('throws ConfigError for invalid schema', async () => {
			await writeFile(
				configPath,
				JSON.stringify({
					agent: { maxRetries: 'not a number' },
				})
			)

			await expect(loadConfig(configPath)).rejects.toThrow(ConfigError)
			await expect(loadConfig(configPath)).rejects.toThrow('validation failed')
		})
	})

	describe('loadResolvedConfig', () => {
		it('applies defaults for missing file', async () => {
			const resolved = await loadResolvedConfig(configPath)

			expect(resolved.agent.llm).toBe('anthropic')
			expect(resolved.agent.maxRetries).toBe(5)
			expect(resolved.agent.baseBackoffMs).toBe(10_000)
			expect(resolved.agent.maxBackoffMs).toBe(600_000)
			expect(resolved.agent.rateLimitDefaultMs).toBe(60_000)
			expect(resolved.debug.output).toBe('stderr')
		})

		it('merges config with defaults', async () => {
			await writeFile(
				configPath,
				JSON.stringify({
					agent: { maxRetries: 10 },
				})
			)

			const resolved = await loadResolvedConfig(configPath)

			expect(resolved.agent.maxRetries).toBe(10)
			expect(resolved.agent.baseBackoffMs).toBe(10_000) // default
		})
	})

	describe('saveConfig', () => {
		it('creates directory and saves config', async () => {
			const nestedPath = join(tempDir, 'nested', 'dir', 'config.json')
			const config = { agent: { maxRetries: 7 } }

			await saveConfig(config, nestedPath)

			const content = await readFile(nestedPath, 'utf-8')
			expect(JSON.parse(content)).toEqual(config)
		})

		it('formats JSON with tabs', async () => {
			await saveConfig({ agent: { maxRetries: 5 } }, configPath)

			const content = await readFile(configPath, 'utf-8')
			expect(content).toContain('\t')
		})

		it('adds trailing newline', async () => {
			await saveConfig({}, configPath)

			const content = await readFile(configPath, 'utf-8')
			expect(content.endsWith('\n')).toBe(true)
		})

		it('throws ConfigError for invalid config', async () => {
			const invalidConfig = {
				agent: { maxRetries: -1 }, // Invalid: negative
			}

			await expect(saveConfig(invalidConfig as any, configPath)).rejects.toThrow(
				ConfigError
			)
		})

		it('overwrites existing config', async () => {
			await saveConfig({ agent: { maxRetries: 1 } }, configPath)
			await saveConfig({ agent: { maxRetries: 2 } }, configPath)

			const config = await loadConfig(configPath)
			expect(config.agent?.maxRetries).toBe(2)
		})
	})
})
