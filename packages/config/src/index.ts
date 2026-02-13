// Path resolution
export {
	getTenderPaths,
	getConfigFilePath,
	getDatabasePath,
	getDebugLogPath,
	type TenderPaths,
} from './paths.js'

// Config loading/saving
export {
	loadConfig,
	loadResolvedConfig,
	saveConfig,
	ConfigError,
} from './config.js'

// Types and schemas
export {
	tenderConfigSchema,
	agentConfigSchema,
	uiConfigSchema,
	debugConfigSchema,
	resolveConfig,
	detectUnicodeSupport,
	AGENT_DEFAULTS,
	DEBUG_DEFAULTS,
	type LlmProvider,
	type TenderConfig,
	type AgentConfig,
	type UiConfig,
	type DebugConfig,
	type ResolvedTenderConfig,
} from './types.js'
