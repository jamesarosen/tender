import { describe, it, expect } from 'vitest'
import { getKeyLabels } from './keyLabels.js'

describe('getKeyLabels', () => {
	it('returns Unicode symbols when unicode is true', () => {
		const labels = getKeyLabels(true)
		expect(labels.enter).toBe('⏎')
		expect(labels.tab).toBe('⇥')
		expect(labels.esc).toBe('Esc')
	})

	it('returns ASCII labels when unicode is false', () => {
		const labels = getKeyLabels(false)
		expect(labels.enter).toBe('Ret')
		expect(labels.tab).toBe('Tab')
		expect(labels.esc).toBe('Esc')
	})
})
