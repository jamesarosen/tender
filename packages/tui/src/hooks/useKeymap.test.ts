import { describe, it, expect } from 'vitest'
import type { Key } from 'ink'
import { hasModifier } from './useKeymap.js'

const baseKey: Key = {
	upArrow: false,
	downArrow: false,
	leftArrow: false,
	rightArrow: false,
	pageDown: false,
	pageUp: false,
	home: false,
	end: false,
	return: false,
	escape: false,
	ctrl: false,
	shift: false,
	tab: false,
	backspace: false,
	delete: false,
	meta: false,
}

describe('hasModifier', () => {
	it('returns false for a plain key', () => {
		expect(hasModifier(baseKey)).toBe(false)
	})

	it('returns true when ctrl is held', () => {
		expect(hasModifier({ ...baseKey, ctrl: true })).toBe(true)
	})

	it('returns true when meta is held', () => {
		expect(hasModifier({ ...baseKey, meta: true })).toBe(true)
	})

	it('returns true when both ctrl and meta are held', () => {
		expect(hasModifier({ ...baseKey, ctrl: true, meta: true })).toBe(true)
	})

	it('returns false when only shift is held (shift is needed for keys like ?)', () => {
		expect(hasModifier({ ...baseKey, shift: true })).toBe(false)
	})
})
