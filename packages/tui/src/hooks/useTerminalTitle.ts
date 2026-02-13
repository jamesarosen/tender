import { useEffect } from 'react'

/**
 * Sets the terminal window/tab title via the OSC escape sequence.
 * Clears the custom title on unmount so the shell can reclaim it.
 */
export function useTerminalTitle(title: string): void {
	useEffect(() => {
		if (!process.stdout.isTTY) return

		const safe = title.replace(/[\x00-\x1f\x7f-\x9f]/g, '')
		try {
			process.stdout.write(`\x1b]0;${safe}\x07`)
		} catch {
			// Terminal title is cosmetic; ignore write failures
		}

		return () => {
			try {
				process.stdout.write('\x1b]0;\x07')
			} catch {
				// Ignore cleanup failures
			}
		}
	}, [title])
}
