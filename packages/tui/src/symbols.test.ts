import { describe, it, expect } from 'vitest'
import { getSymbols } from './symbols.js'

describe('getSymbols', () => {
	it('returns Unicode symbols when unicode is true', () => {
		const sym = getSymbols(true)
		expect(sym.enter).toBe('⏎')
		expect(sym.tab).toBe('⇥')
		expect(sym.esc).toBe('Esc')
		expect(sym.ellipsis).toBe('…')
	})

	it('returns ASCII symbols when unicode is false', () => {
		const sym = getSymbols(false)
		expect(sym.enter).toBe('Ret')
		expect(sym.tab).toBe('Tab')
		expect(sym.esc).toBe('Esc')
		expect(sym.ellipsis).toBe('...')
	})
})
