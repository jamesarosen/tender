/**
 * Canned responses for degraded mode when the LLM is unavailable.
 *
 * These provide a warm, human-like experience even when Tender
 * can't engage in full conversation. The tone matches Tender's
 * personality: warm but not saccharine, brief, and helpful.
 */

/**
 * Response templates for common interactions in degraded mode.
 */
export const degradedResponses = {
	// Signal acknowledgments
	reflectionRecorded:
		"Recorded. I'll dig into this when I'm back online. Would you like to add anything else right now?",
	skipAcknowledged: "Got it. I've noted that you skipped this one.",
	completionAcknowledged: "Nice work! I've marked that complete.",
	deferralAcknowledged: "No problem. I've pushed this one back for now.",

	// Task actions
	taskCreated: 'Added to your list.',
	taskUpdated: 'Updated.',
	taskDeleted: 'Removed from your list.',

	// Blocker handling
	blockerAdded: "Noted. I've marked this as blocked.",
	blockerCleared: 'Great, the blocker is cleared.',

	// Status messages
	offlineNotice:
		"I'm currently offline, but I can still help you track tasks and record your thoughts.",
	reconnecting: 'Trying to reconnect...',
	backOnline: "I'm back online! Let me catch up on what I missed.",

	// Prompts (for gathering input in degraded mode)
	promptReflection: 'How are you feeling about this task?',
	promptBlocker: "What's making this one hard to start?",
	promptFollowUp: "Anything else you'd like to add?",

	// Error fallbacks
	genericAcknowledgment: 'Got it.',
	genericError:
		"Something went wrong. Your data is safe, but I couldn't complete that action.",
} as const

/**
 * Type for response keys, useful for type-safe access.
 */
export type DegradedResponseKey = keyof typeof degradedResponses

/**
 * Gets a degraded response by key.
 * Returns the generic acknowledgment if the key doesn't exist.
 */
export function getDegradedResponse(key: string): string {
	if (key in degradedResponses) {
		return degradedResponses[key as DegradedResponseKey]
	}
	return degradedResponses.genericAcknowledgment
}

/**
 * Response templates that include placeholders for dynamic content.
 * Use with `formatResponse()` to fill in values.
 */
export const degradedResponseTemplates = {
	taskCompletedWithName: "Nice work on '{taskName}'!",
	taskSkippedWithName: "Skipped '{taskName}'. We can come back to it later.",
	deferralCount: "This is the {count} time you've deferred this one.",
	nextSuggestion: "How about '{taskName}' next?",
} as const

/**
 * Type for template keys.
 */
export type DegradedTemplateKey = keyof typeof degradedResponseTemplates

/**
 * Formats a response template with provided values.
 *
 * @param template - The template key or raw template string
 * @param values - Object with placeholder values
 * @returns Formatted string with placeholders replaced
 *
 * @example
 * ```ts
 * formatResponse('taskCompletedWithName', { taskName: 'Email grandma' })
 * // => "Nice work on 'Email grandma'!"
 * ```
 */
export function formatResponse(
	template: DegradedTemplateKey | string,
	values: Record<string, string | number>
): string {
	let text =
		template in degradedResponseTemplates
			? degradedResponseTemplates[template as DegradedTemplateKey]
			: template

	for (const [key, value] of Object.entries(values)) {
		text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
	}

	return text
}
