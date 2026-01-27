import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { getConfigFilePath } from './paths.js'
import {
	tenderConfigSchema,
	resolveConfig,
	type TenderConfig,
	type ResolvedTenderConfig,
} from './types.js'

export class ConfigError extends Error {
	constructor(
		message: string,
		public readonly cause?: unknown
	) {
		super(message)
		this.name = 'ConfigError'
	}
}

/**
 * Loads and validates the config file.
 *
 * @param configPath - Optional path override (defaults to XDG config path)
 * @returns The validated config, or empty config if file doesn't exist
 * @throws ConfigError if file exists but is invalid
 */
export async function loadConfig(
	configPath: string = getConfigFilePath()
): Promise<TenderConfig> {
	let content: string
	try {
		content = await readFile(configPath, 'utf-8')
	} catch (error) {
		if (isNodeError(error) && error.code === 'ENOENT') {
			// Config file doesn't exist, return empty config
			return {}
		}
		throw new ConfigError(`Failed to read config file: ${configPath}`, error)
	}

	let parsed: unknown
	try {
		parsed = JSON.parse(content)
	} catch (error) {
		throw new ConfigError(`Config file is not valid JSON: ${configPath}`, error)
	}

	const result = tenderConfigSchema.safeParse(parsed)
	if (!result.success) {
		throw new ConfigError(
			`Config validation failed: ${result.error.message}`,
			result.error
		)
	}

	return result.data
}

/**
 * Loads config and resolves all defaults.
 *
 * @param configPath - Optional path override (defaults to XDG config path)
 * @returns Fully resolved config with all defaults applied
 */
export async function loadResolvedConfig(
	configPath: string = getConfigFilePath()
): Promise<ResolvedTenderConfig> {
	const config = await loadConfig(configPath)
	return resolveConfig(config)
}

/**
 * Saves config to disk.
 *
 * @param config - The config to save
 * @param configPath - Optional path override (defaults to XDG config path)
 */
export async function saveConfig(
	config: TenderConfig,
	configPath: string = getConfigFilePath()
): Promise<void> {
	// Validate before saving
	const result = tenderConfigSchema.safeParse(config)
	if (!result.success) {
		throw new ConfigError(
			`Cannot save invalid config: ${result.error.message}`,
			result.error
		)
	}

	// Ensure directory exists
	const dir = dirname(configPath)
	await mkdir(dir, { recursive: true })

	const content = JSON.stringify(result.data, null, '\t')
	await writeFile(configPath, content + '\n', 'utf-8')
}

/**
 * Type guard for Node.js errors with code property.
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && 'code' in error
}
