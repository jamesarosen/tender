import { faker } from '@faker-js/faker'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
	getTenderPaths,
	getConfigFilePath,
	getDatabasePath,
	getDebugLogPath,
} from './paths.js'

describe('paths', () => {
	const originalEnv = { ...process.env }
	let fakeHome: string

	beforeEach(() => {
		// Use a fake HOME to avoid depending on real system paths
		const fakeUsername = faker.internet.username()
		fakeHome = `/users/${fakeUsername}`
		process.env.HOME = fakeHome

		// Clear XDG env vars for consistent testing
		delete process.env.XDG_CONFIG_HOME
		delete process.env.XDG_DATA_HOME
		delete process.env.XDG_STATE_HOME
		delete process.env.XDG_CACHE_HOME
	})

	afterEach(() => {
		// Restore original env
		process.env = { ...originalEnv }
	})

	describe('getTenderPaths', () => {
		it('returns default XDG paths when env vars not set', () => {
			const paths = getTenderPaths()

			expect(paths.config).toBe(`${fakeHome}/.config/tender`)
			expect(paths.data).toBe(`${fakeHome}/.local/share/tender`)
			expect(paths.state).toBe(`${fakeHome}/.local/state/tender`)
			expect(paths.cache).toBe(`${fakeHome}/.cache/tender`)
		})

		it('respects XDG_CONFIG_HOME', () => {
			process.env.XDG_CONFIG_HOME = '/custom/config'
			const paths = getTenderPaths()

			expect(paths.config).toBe('/custom/config/tender')
		})

		it('respects XDG_DATA_HOME', () => {
			process.env.XDG_DATA_HOME = '/custom/data'
			const paths = getTenderPaths()

			expect(paths.data).toBe('/custom/data/tender')
		})

		it('respects XDG_STATE_HOME', () => {
			process.env.XDG_STATE_HOME = '/custom/state'
			const paths = getTenderPaths()

			expect(paths.state).toBe('/custom/state/tender')
		})

		it('respects XDG_CACHE_HOME', () => {
			process.env.XDG_CACHE_HOME = '/custom/cache'
			const paths = getTenderPaths()

			expect(paths.cache).toBe('/custom/cache/tender')
		})
	})

	describe('getConfigFilePath', () => {
		it('returns config.json in config directory', () => {
			expect(getConfigFilePath()).toBe(`${fakeHome}/.config/tender/config.json`)
		})

		it('respects XDG_CONFIG_HOME', () => {
			process.env.XDG_CONFIG_HOME = '/custom/config'
			expect(getConfigFilePath()).toBe('/custom/config/tender/config.json')
		})
	})

	describe('getDatabasePath', () => {
		it('returns tender.db in data directory', () => {
			expect(getDatabasePath()).toBe(`${fakeHome}/.local/share/tender/tender.db`)
		})

		it('respects XDG_DATA_HOME', () => {
			process.env.XDG_DATA_HOME = '/custom/data'
			expect(getDatabasePath()).toBe('/custom/data/tender/tender.db')
		})
	})

	describe('getDebugLogPath', () => {
		it('returns debug.log in state directory', () => {
			expect(getDebugLogPath()).toBe(`${fakeHome}/.local/state/tender/debug.log`)
		})

		it('respects XDG_STATE_HOME', () => {
			process.env.XDG_STATE_HOME = '/custom/state'
			expect(getDebugLogPath()).toBe('/custom/state/tender/debug.log')
		})
	})
})
