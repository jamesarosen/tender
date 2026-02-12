import { describe, it, expect } from 'vitest'
import { extractTags, parseTagSegments } from './tags.js'

describe('extractTags', () => {
	it('returns empty array for text without tags', () => {
		expect(extractTags('Buy milk')).toEqual([])
	})

	it('extracts a single tag', () => {
		expect(extractTags('Buy milk #errand')).toEqual(['errand'])
	})

	it('extracts multiple tags', () => {
		expect(extractTags('Buy milk #errand #groceries')).toEqual([
			'errand',
			'groceries',
		])
	})

	it('extracts tags from anywhere in the string', () => {
		expect(extractTags('Buy #errand milk for #home')).toEqual(['errand', 'home'])
	})

	it('extracts tag at start of string', () => {
		expect(extractTags('#errand buy milk')).toEqual(['errand'])
	})

	it('deduplicates tags', () => {
		expect(extractTags('#errand buy milk #errand')).toEqual(['errand'])
	})

	it('supports hyphens and underscores in tags', () => {
		expect(extractTags('#my-tag #my_tag')).toEqual(['my-tag', 'my_tag'])
	})

	it('requires tags to start with a letter', () => {
		expect(extractTags('#v2')).toEqual(['v2'])
		expect(extractTags('#123')).toEqual([])
		expect(extractTags('#-invalid')).toEqual([])
		expect(extractTags('#_invalid')).toEqual([])
	})

	it('does not match bare # or # followed by space', () => {
		expect(extractTags('issue # 5')).toEqual([])
	})

	it('does not match URL fragments', () => {
		expect(extractTags('See https://example.com#section')).toEqual([])
	})

	it('does not match # in the middle of words', () => {
		expect(extractTags('C#programming')).toEqual([])
		expect(extractTags('Issue#123')).toEqual([])
	})

	it('preserves order of first occurrence', () => {
		expect(extractTags('#b #a #c #a')).toEqual(['b', 'a', 'c'])
	})
})

describe('parseTagSegments', () => {
	it('returns single text segment for plain text', () => {
		expect(parseTagSegments('Buy milk')).toEqual([
			{ type: 'text', value: 'Buy milk' },
		])
	})

	it('splits text around a tag', () => {
		expect(parseTagSegments('Buy milk #errand')).toEqual([
			{ type: 'text', value: 'Buy milk ' },
			{ type: 'tag', value: '#errand' },
		])
	})

	it('handles tag in the middle of text', () => {
		expect(parseTagSegments('Buy #errand milk')).toEqual([
			{ type: 'text', value: 'Buy ' },
			{ type: 'tag', value: '#errand' },
			{ type: 'text', value: ' milk' },
		])
	})

	it('handles tag at start of text', () => {
		expect(parseTagSegments('#errand buy milk')).toEqual([
			{ type: 'tag', value: '#errand' },
			{ type: 'text', value: ' buy milk' },
		])
	})

	it('handles multiple adjacent tags', () => {
		expect(parseTagSegments('#errand #home')).toEqual([
			{ type: 'tag', value: '#errand' },
			{ type: 'text', value: ' ' },
			{ type: 'tag', value: '#home' },
		])
	})

	it('does not split URL fragments', () => {
		expect(parseTagSegments('See https://example.com#section')).toEqual([
			{ type: 'text', value: 'See https://example.com#section' },
		])
	})

	it('returns empty array for empty string', () => {
		expect(parseTagSegments('')).toEqual([])
	})
})
