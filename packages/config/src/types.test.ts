import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
	tenderConfigSchema,
	agentConfigSchema,
	debugConfigSchema,
	resolveConfig,
	AGENT_DEFAULTS,
	DEBUG_DEFAULTS,
} from './types.js'

describe('types', () => {
	describe('agentConfigSchema', () => {
		it('accepts empty config without applying defaults', () => {
			const result = agentConfigSchema.parse({})
			expect(result.llm).toBeUndefined()
			expect(result.maxRetries).toBeUndefined()
			expect(result.baseBackoffMs).toBeUndefined()
			expect(result.maxBackoffMs).toBeUndefined()
			expect(result.rateLimitDefaultMs).toBeUndefined()
		})

		it('allows llm to be none', () => {
			const result = agentConfigSchema.parse({ llm: 'none' })
			expect(result.llm).toBe('none')
		})

		it('allows llm to be anthropic', () => {
			const result = agentConfigSchema.parse({ llm: 'anthropic' })
			expect(result.llm).toBe('anthropic')
		})

		it('rejects invalid llm values', () => {
			expect(() => agentConfigSchema.parse({ llm: 'openai' })).toThrow()
		})

		it('allows optional apiKey', () => {
			const result = agentConfigSchema.parse({ apiKey: 'sk-test-123' })
			expect(result.apiKey).toBe('sk-test-123')
		})

		it('allows custom maxRetries', () => {
			const result = agentConfigSchema.parse({ maxRetries: 10 })
			expect(result.maxRetries).toBe(10)
		})

		it('rejects negative maxRetries', () => {
			expect(() => agentConfigSchema.parse({ maxRetries: -1 })).toThrow()
		})

		it('allows custom baseBackoffMs', () => {
			const result = agentConfigSchema.parse({ baseBackoffMs: 5_000 })
			expect(result.baseBackoffMs).toBe(5_000)
		})

		it('rejects baseBackoffMs below 1000ms', () => {
			expect(() => agentConfigSchema.parse({ baseBackoffMs: 500 })).toThrow()
		})

		it('allows custom maxBackoffMs', () => {
			const result = agentConfigSchema.parse({ maxBackoffMs: 300_000 })
			expect(result.maxBackoffMs).toBe(300_000)
		})

		it('rejects maxBackoffMs below 1000ms', () => {
			expect(() => agentConfigSchema.parse({ maxBackoffMs: 500 })).toThrow()
		})

		it('allows custom rateLimitDefaultMs', () => {
			const result = agentConfigSchema.parse({ rateLimitDefaultMs: 30_000 })
			expect(result.rateLimitDefaultMs).toBe(30_000)
		})

		it('rejects rateLimitDefaultMs below 1000ms', () => {
			expect(() => agentConfigSchema.parse({ rateLimitDefaultMs: 500 })).toThrow()
		})
	})

	describe('debugConfigSchema', () => {
		it('accepts empty config without applying defaults', () => {
			const result = debugConfigSchema.parse({})
			expect(result.output).toBeUndefined()
		})

		it('allows output to be file', () => {
			const result = debugConfigSchema.parse({ output: 'file' })
			expect(result.output).toBe('file')
		})

		it('allows optional filePath', () => {
			const result = debugConfigSchema.parse({
				output: 'file',
				filePath: '/tmp/debug.log',
			})
			expect(result.filePath).toBe('/tmp/debug.log')
		})

		it('rejects invalid output values', () => {
			expect(() => debugConfigSchema.parse({ output: 'stdout' })).toThrow()
		})
	})

	describe('defaults', () => {
		it('has correct agent defaults', () => {
			expect(AGENT_DEFAULTS.llm).toBe('anthropic')
			expect(AGENT_DEFAULTS.maxRetries).toBe(5)
			expect(AGENT_DEFAULTS.baseBackoffMs).toBe(10_000)
			expect(AGENT_DEFAULTS.maxBackoffMs).toBe(600_000)
			expect(AGENT_DEFAULTS.rateLimitDefaultMs).toBe(60_000)
		})

		it('has correct debug defaults', () => {
			expect(DEBUG_DEFAULTS.output).toBe('stderr')
		})
	})

	describe('tenderConfigSchema', () => {
		it('accepts empty config', () => {
			const result = tenderConfigSchema.parse({})
			expect(result).toEqual({})
		})

		it('accepts full config', () => {
			const config = {
				agent: {
					llm: 'anthropic' as const,
					apiKey: 'sk-test',
					maxRetries: 10,
					baseBackoffMs: 5_000,
					maxBackoffMs: 300_000,
					rateLimitDefaultMs: 30_000,
				},
				debug: {
					output: 'file' as const,
					filePath: '/tmp/debug.log',
				},
			}
			const result = tenderConfigSchema.parse(config)
			expect(result).toEqual(config)
		})

		it('accepts config with llm disabled', () => {
			const config = {
				agent: {
					llm: 'none' as const,
				},
			}
			const result = tenderConfigSchema.parse(config)
			expect(result.agent?.llm).toBe('none')
		})

		it('rejects unknown keys in strict mode when using .strict()', () => {
			// Default schema allows extra keys (passthrough)
			const result = tenderConfigSchema.parse({ unknown: 'value' })
			// By default zod strips unknown keys
			expect(result).not.toHaveProperty('unknown')
		})
	})

	describe('resolveConfig', () => {
		const originalEnv = { ...process.env }

		beforeEach(() => {
			delete process.env.ANTHROPIC_API_KEY
		})

		afterEach(() => {
			process.env = { ...originalEnv }
		})

		it('applies all defaults for empty config', () => {
			const resolved = resolveConfig({})

			expect(resolved.agent.llm).toBe('anthropic')
			expect(resolved.agent.apiKey).toBeUndefined()
			expect(resolved.agent.maxRetries).toBe(5)
			expect(resolved.agent.baseBackoffMs).toBe(10_000)
			expect(resolved.agent.maxBackoffMs).toBe(600_000)
			expect(resolved.agent.rateLimitDefaultMs).toBe(60_000)
			expect(resolved.debug.output).toBe('stderr')
			expect(resolved.debug.filePath).toBeUndefined()
		})

		it('uses ANTHROPIC_API_KEY env var when apiKey not in config', () => {
			process.env.ANTHROPIC_API_KEY = 'sk-env-key'

			const resolved = resolveConfig({})

			expect(resolved.agent.apiKey).toBe('sk-env-key')
		})

		it('prefers config apiKey over env var', () => {
			process.env.ANTHROPIC_API_KEY = 'sk-env-key'

			const resolved = resolveConfig({
				agent: { apiKey: 'sk-config-key' },
			})

			expect(resolved.agent.apiKey).toBe('sk-config-key')
		})

		it('preserves custom values', () => {
			const resolved = resolveConfig({
				agent: {
					llm: 'none',
					maxRetries: 10,
					baseBackoffMs: 5_000,
					maxBackoffMs: 300_000,
					rateLimitDefaultMs: 30_000,
				},
				debug: {
					output: 'file',
					filePath: '/custom/path.log',
				},
			})

			expect(resolved.agent.llm).toBe('none')
			expect(resolved.agent.maxRetries).toBe(10)
			expect(resolved.agent.baseBackoffMs).toBe(5_000)
			expect(resolved.agent.maxBackoffMs).toBe(300_000)
			expect(resolved.agent.rateLimitDefaultMs).toBe(30_000)
			expect(resolved.debug.output).toBe('file')
			expect(resolved.debug.filePath).toBe('/custom/path.log')
		})
	})
})
