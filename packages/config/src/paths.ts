import { homedir } from 'node:os'
import { join } from 'node:path'

const APP_NAME = 'tender'

/**
 * XDG Base Directory paths for Tender.
 *
 * Follows the XDG Base Directory Specification:
 * https://specifications.freedesktop.org/basedir-spec/latest/
 *
 * - config: User configuration files (config.json)
 * - data: User data files (database)
 * - state: User state files (logs, conversation history)
 * - cache: Non-essential cached data
 */
export interface TenderPaths {
	/** Config directory: XDG_CONFIG_HOME/tender */
	config: string
	/** Data directory: XDG_DATA_HOME/tender */
	data: string
	/** State directory: XDG_STATE_HOME/tender */
	state: string
	/** Cache directory: XDG_CACHE_HOME/tender */
	cache: string
}

/**
 * Returns the home directory, with override support for testing.
 */
function getHome(): string {
	return process.env.HOME ?? homedir()
}

/**
 * Resolves XDG_CONFIG_HOME with fallback to ~/.config
 */
function getConfigHome(): string {
	return process.env.XDG_CONFIG_HOME ?? join(getHome(), '.config')
}

/**
 * Resolves XDG_DATA_HOME with fallback to ~/.local/share
 */
function getDataHome(): string {
	return process.env.XDG_DATA_HOME ?? join(getHome(), '.local', 'share')
}

/**
 * Resolves XDG_STATE_HOME with fallback to ~/.local/state
 */
function getStateHome(): string {
	return process.env.XDG_STATE_HOME ?? join(getHome(), '.local', 'state')
}

/**
 * Resolves XDG_CACHE_HOME with fallback to ~/.cache
 */
function getCacheHome(): string {
	return process.env.XDG_CACHE_HOME ?? join(getHome(), '.cache')
}

/**
 * Returns all Tender-specific paths following XDG Base Directory spec.
 */
export function getTenderPaths(): TenderPaths {
	return {
		config: join(getConfigHome(), APP_NAME),
		data: join(getDataHome(), APP_NAME),
		state: join(getStateHome(), APP_NAME),
		cache: join(getCacheHome(), APP_NAME),
	}
}

/**
 * Returns the path to the config file.
 */
export function getConfigFilePath(): string {
	return join(getTenderPaths().config, 'config.json')
}

/**
 * Returns the path to the database file.
 */
export function getDatabasePath(): string {
	return join(getTenderPaths().data, 'tender.db')
}

/**
 * Returns the path to the debug log file.
 */
export function getDebugLogPath(): string {
	return join(getTenderPaths().state, 'debug.log')
}
