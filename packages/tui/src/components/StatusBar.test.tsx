import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from 'ink-testing-library'
import { StatusBar } from './StatusBar.js'

describe('StatusBar', () => {
	it('shows "AI: Online" when available', () => {
		const { lastFrame } = render(
			<StatusBar llmStatus="available" keyHints="[s]kip" />
		)
		expect(lastFrame()).toContain('AI: Online')
		expect(lastFrame()).toContain('[s]kip')
	})

	it('shows "AI: ..." when checking', () => {
		const { lastFrame } = render(<StatusBar llmStatus="checking" />)
		expect(lastFrame()).toContain('AI: ...')
	})

	it('shows "AI: Key needed" when keyMissing', () => {
		const { lastFrame } = render(<StatusBar llmStatus="keyMissing" />)
		expect(lastFrame()).toContain('AI: Key needed')
	})

	it('shows "AI: Invalid key" when invalidKey', () => {
		const { lastFrame } = render(<StatusBar llmStatus="invalidKey" />)
		expect(lastFrame()).toContain('AI: Invalid key')
	})

	it('shows "AI: Offline" when serviceDown', () => {
		const { lastFrame } = render(<StatusBar llmStatus="serviceDown" />)
		expect(lastFrame()).toContain('AI: Offline')
	})

	it('shows countdown when rateLimited', () => {
		const { lastFrame } = render(
			<StatusBar llmStatus="rateLimited" retryAfterMs={30000} />
		)
		expect(lastFrame()).toContain('AI: Limited (30s)')
	})

	it('hides status when disabled', () => {
		const { lastFrame } = render(<StatusBar llmStatus="disabled" />)
		expect(lastFrame()).not.toContain('AI:')
	})

	it('shows default key hints', () => {
		const { lastFrame } = render(<StatusBar llmStatus="available" />)
		expect(lastFrame()).toContain('[s]kip')
		expect(lastFrame()).toContain('[c]omplete')
		expect(lastFrame()).toContain('[d]ay')
		expect(lastFrame()).toContain('[a]dd')
	})
})
