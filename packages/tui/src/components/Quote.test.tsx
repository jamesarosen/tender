import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from 'ink-testing-library'
import { Quote } from './Quote.js'

describe('Quote', () => {
	it('displays quote text', () => {
		const { lastFrame } = render(<Quote quote={{ text: 'Empty your cup.' }} />)
		expect(lastFrame()).toContain('Empty your cup.')
	})

	it('displays author when provided', () => {
		const { lastFrame } = render(
			<Quote
				quote={{
					text: 'Walk as if you are kissing the Earth with your feet.',
					author: 'Thich Nhat Hanh',
				}}
			/>
		)
		expect(lastFrame()).toContain('Thich Nhat Hanh')
		expect(lastFrame()).toContain('—')
	})

	it('omits author line when not provided', () => {
		const { lastFrame } = render(<Quote quote={{ text: 'What is this?' }} />)
		expect(lastFrame()).not.toContain('—')
	})
})
