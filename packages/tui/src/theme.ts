/**
 * Semantic color tokens for the TUI.
 *
 * Maps intent to terminal-safe colors (see README.md for guidelines).
 * Only colors from the safe subset are used: red, green, yellow, blue,
 * magenta, cyan, and their bright variants where noted.
 */
export const colors = {
	/** Interactive elements: key hints, tags, prompts */
	interactive: 'cyan',
	/** Success or active state */
	success: 'green',
	/** Time-sensitive or attention-needed state */
	warning: 'yellow',
	/** Errors or critical status */
	danger: 'red',
} as const
