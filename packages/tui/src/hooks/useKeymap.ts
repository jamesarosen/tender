import { useInput, type Key } from 'ink'

export interface KeymapLayer {
	name: string
	handlers: Record<string, () => boolean>
	passthrough?: boolean
}

/** Returns true if Ctrl or Meta is held. Shift is excluded so keys like '?' (Shift+/) still work. */
export function hasModifier(key: Key): boolean {
	return key.ctrl || key.meta
}

/**
 * Centralized keymap with modal awareness.
 *
 * Layers are processed in order. If a handler returns true, the event
 * is considered handled. If passthrough is false (default), unhandled
 * events don't propagate to lower layers.
 */
export function useKeymap(layers: KeymapLayer[]) {
	useInput((input, key) => {
		// Build a key string for special keys
		let keyString = input
		let isSpecial = false

		if (key.escape) {
			keyString = 'escape'
			isSpecial = true
		} else if (key.return) {
			keyString = 'return'
			isSpecial = true
		} else if (key.tab) {
			keyString = 'tab'
			isSpecial = true
		} else if (key.backspace || key.delete) {
			keyString = 'backspace'
			isSpecial = true
		} else if (key.upArrow) {
			keyString = 'up'
			isSpecial = true
		} else if (key.downArrow) {
			keyString = 'down'
			isSpecial = true
		} else if (key.leftArrow) {
			keyString = 'left'
			isSpecial = true
		} else if (key.rightArrow) {
			keyString = 'right'
			isSpecial = true
		}

		// Don't match character keys when a modifier is held
		if (!isSpecial && hasModifier(key)) return

		for (const layer of layers) {
			const handler = layer.handlers[keyString]
			if (handler?.()) return // handled

			if (!layer.passthrough) return // blocked
		}
	})
}

/**
 * Creates a layer that handles common navigation keys.
 */
export function createNavigationLayer(
	onEscape: () => void,
	options?: { passthrough?: boolean }
): KeymapLayer {
	return {
		name: 'navigation',
		handlers: {
			escape: () => {
				onEscape()
				return true
			},
		},
		passthrough: options?.passthrough ?? true,
	}
}
