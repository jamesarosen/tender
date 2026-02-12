import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from 'ink-testing-library'
import { TagText, tagColorIndex } from './TagText.js'

describe('tagColorIndex', () => {
	it('returns a number between 0 and 5', () => {
		for (const tag of ['errand', 'home', 'work', 'urgent', 'v2', 'a-b_c']) {
			const idx = tagColorIndex(tag)
			expect(idx).toBeGreaterThanOrEqual(0)
			expect(idx).toBeLessThan(6)
		}
	})

	it('returns the same index for the same tag', () => {
		expect(tagColorIndex('errand')).toBe(tagColorIndex('errand'))
	})

	it('distributes different tags across multiple colors', () => {
		const indices = new Set(
			['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(tagColorIndex)
		)
		// With 10 different single-char tags and 6 colors, expect at least 3 distinct
		expect(indices.size).toBeGreaterThanOrEqual(3)
	})
})

describe('TagText', () => {
	it('renders plain text unchanged', () => {
		const { lastFrame } = render(<TagText>Buy milk</TagText>)
		expect(lastFrame()).toContain('Buy milk')
	})

	it('renders inline tags', () => {
		const { lastFrame } = render(<TagText>Buy milk #errand</TagText>)
		expect(lastFrame()).toContain('Buy milk')
		expect(lastFrame()).toContain('#errand')
	})

	it('renders tags appearing mid-text', () => {
		const { lastFrame } = render(<TagText>Buy #errand milk</TagText>)
		expect(lastFrame()).toContain('Buy')
		expect(lastFrame()).toContain('#errand')
		expect(lastFrame()).toContain('milk')
	})
})
