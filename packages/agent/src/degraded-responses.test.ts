import { describe, it, expect } from 'vitest'
import {
	degradedResponses,
	degradedResponseTemplates,
	getDegradedResponse,
	formatResponse,
} from './degraded-responses.js'

describe('degradedResponses', () => {
	it('contains all required response types', () => {
		// Signal acknowledgments
		expect(degradedResponses.reflectionRecorded).toBeDefined()
		expect(degradedResponses.skipAcknowledged).toBeDefined()
		expect(degradedResponses.completionAcknowledged).toBeDefined()
		expect(degradedResponses.deferralAcknowledged).toBeDefined()

		// Task actions
		expect(degradedResponses.taskCreated).toBeDefined()
		expect(degradedResponses.taskUpdated).toBeDefined()
		expect(degradedResponses.taskDeleted).toBeDefined()

		// Status messages
		expect(degradedResponses.offlineNotice).toBeDefined()
		expect(degradedResponses.reconnecting).toBeDefined()
		expect(degradedResponses.backOnline).toBeDefined()

		// Prompts
		expect(degradedResponses.promptReflection).toBeDefined()
		expect(degradedResponses.promptBlocker).toBeDefined()
		expect(degradedResponses.promptFollowUp).toBeDefined()

		// Error fallbacks
		expect(degradedResponses.genericAcknowledgment).toBeDefined()
		expect(degradedResponses.genericError).toBeDefined()
	})

	it('has non-empty strings for all responses', () => {
		for (const [key, value] of Object.entries(degradedResponses)) {
			expect(value.length, `${key} should not be empty`).toBeGreaterThan(0)
		}
	})

	it('reflection response includes follow-up prompt', () => {
		expect(degradedResponses.reflectionRecorded).toContain(
			'Would you like to add anything'
		)
	})

	it('offline notice explains capabilities', () => {
		expect(degradedResponses.offlineNotice).toContain('offline')
		expect(degradedResponses.offlineNotice).toContain('track tasks')
	})
})

describe('getDegradedResponse', () => {
	it('returns response for valid key', () => {
		expect(getDegradedResponse('completionAcknowledged')).toBe(
			degradedResponses.completionAcknowledged
		)
	})

	it('returns generic acknowledgment for unknown key', () => {
		expect(getDegradedResponse('unknownKey')).toBe(
			degradedResponses.genericAcknowledgment
		)
	})

	it('returns generic acknowledgment for empty string', () => {
		expect(getDegradedResponse('')).toBe(degradedResponses.genericAcknowledgment)
	})
})

describe('degradedResponseTemplates', () => {
	it('contains placeholder templates', () => {
		expect(degradedResponseTemplates.taskCompletedWithName).toContain(
			'{taskName}'
		)
		expect(degradedResponseTemplates.taskSkippedWithName).toContain('{taskName}')
		expect(degradedResponseTemplates.deferralCount).toContain('{count}')
		expect(degradedResponseTemplates.nextSuggestion).toContain('{taskName}')
	})
})

describe('formatResponse', () => {
	it('replaces single placeholder', () => {
		const result = formatResponse('taskCompletedWithName', {
			taskName: 'Email grandma',
		})
		expect(result).toBe("Nice work on 'Email grandma'!")
	})

	it('replaces multiple placeholders', () => {
		const result = formatResponse('deferralCount', { count: 3 })
		expect(result).toBe("This is the 3 time you've deferred this one.")
	})

	it('handles numeric values', () => {
		const result = formatResponse('deferralCount', { count: 5 })
		expect(result).toContain('5')
	})

	it('replaces all occurrences of same placeholder', () => {
		const result = formatResponse('{name} and {name}', { name: 'test' })
		expect(result).toBe('test and test')
	})

	it('accepts raw template string', () => {
		const result = formatResponse('Hello {user}!', { user: 'Alice' })
		expect(result).toBe('Hello Alice!')
	})

	it('leaves unmatched placeholders unchanged', () => {
		const result = formatResponse('Hello {user} and {other}!', { user: 'Alice' })
		expect(result).toBe('Hello Alice and {other}!')
	})

	it('handles empty values object', () => {
		const result = formatResponse('taskCompletedWithName', {})
		expect(result).toContain('{taskName}')
	})
})
