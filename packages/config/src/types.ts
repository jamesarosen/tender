import { z } from 'zod'

/** LLM provider options */
export type LlmProvider = 'none' | 'anthropic'

// Default values for agent config
export const AGENT_DEFAULTS = {
	llm: 'anthropic' as LlmProvider,
	maxRetries: 5,
	baseBackoffMs: 10_000, // 10 seconds
	maxBackoffMs: 600_000, // 10 minutes
	rateLimitDefaultMs: 60_000, // 60 seconds
} as const

// Default values for debug config
export const DEBUG_DEFAULTS = {
	output: 'stderr' as const,
} as const

/**
 * Agent configuration for LLM availability and retry behavior.
 * This schema validates input without applying defaults.
 */
export const agentConfigSchema = z.object({
	/** LLM provider. Set to 'none' to disable LLM features. Default: 'anthropic' */
	llm: z.enum(['none', 'anthropic']).optional(),
	/** API key for the LLM provider. Falls back to ANTHROPIC_API_KEY env var. */
	apiKey: z.string().optional(),
	/** Maximum retry attempts before giving up on service errors. Default: 5 */
	maxRetries: z.number().int().min(0).optional(),
	/** Initial backoff delay in ms for exponential backoff. Default: 10000 (10s) */
	baseBackoffMs: z.number().int().min(1000).optional(),
	/** Maximum backoff delay in ms. Default: 600000 (10 min) */
	maxBackoffMs: z.number().int().min(1000).optional(),
	/** Default delay in ms when rate limited without Retry-After header. Default: 60000 (60s) */
	rateLimitDefaultMs: z.number().int().min(1000).optional(),
})

export type AgentConfig = z.infer<typeof agentConfigSchema>

/**
 * Debug output configuration.
 * This schema validates input without applying defaults.
 */
export const debugConfigSchema = z.object({
	/** Where to write debug output. */
	output: z.enum(['stderr', 'file']).optional(),
	/** File path for debug output when output is 'file'. */
	filePath: z.string().optional(),
})

export type DebugConfig = z.infer<typeof debugConfigSchema>

/**
 * Root configuration schema for Tender.
 * Validates input without applying defaults.
 */
export const tenderConfigSchema = z.object({
	agent: agentConfigSchema.optional(),
	debug: debugConfigSchema.optional(),
})

export type TenderConfig = z.infer<typeof tenderConfigSchema>

/**
 * Configuration with all defaults applied.
 */
export interface ResolvedTenderConfig {
	agent: {
		llm: LlmProvider
		apiKey: string | undefined
		maxRetries: number
		baseBackoffMs: number
		maxBackoffMs: number
		rateLimitDefaultMs: number
	}
	debug: {
		output: 'stderr' | 'file'
		filePath: string | undefined
	}
}

/**
 * Applies defaults and resolves a partial config to a fully resolved config.
 */
export function resolveConfig(config: TenderConfig): ResolvedTenderConfig {
	const agent = config.agent ?? {}
	const debug = config.debug ?? {}

	return {
		agent: {
			llm: agent.llm ?? AGENT_DEFAULTS.llm,
			apiKey: agent.apiKey ?? process.env.ANTHROPIC_API_KEY,
			maxRetries: agent.maxRetries ?? AGENT_DEFAULTS.maxRetries,
			baseBackoffMs: agent.baseBackoffMs ?? AGENT_DEFAULTS.baseBackoffMs,
			maxBackoffMs: agent.maxBackoffMs ?? AGENT_DEFAULTS.maxBackoffMs,
			rateLimitDefaultMs:
				agent.rateLimitDefaultMs ?? AGENT_DEFAULTS.rateLimitDefaultMs,
		},
		debug: {
			output: debug.output ?? DEBUG_DEFAULTS.output,
			filePath: debug.filePath,
		},
	}
}
