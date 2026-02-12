import { describe, it, expect } from 'vitest'
import { quotes, getRandomQuote } from './quotes.js'

describe('quotes', () => {
	it('contains at least one quote', () => {
		expect(quotes.length).toBeGreaterThan(0)
	})

	it('every quote has non-empty text', () => {
		for (const quote of quotes) {
			expect(typeof quote.text).toBe('string')
			expect(quote.text.length).toBeGreaterThan(0)
		}
	})

	it('authors are non-empty strings when present', () => {
		for (const quote of quotes) {
			if (quote.author !== undefined) {
				expect(typeof quote.author).toBe('string')
				expect(quote.author.length).toBeGreaterThan(0)
			}
		}
	})
})

describe('getRandomQuote', () => {
	it('returns a quote from the collection', () => {
		const quote = getRandomQuote()
		expect(quotes).toContain(quote)
	})
})
