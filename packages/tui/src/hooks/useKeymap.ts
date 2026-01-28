import { useInput } from 'ink'

export interface KeymapLayer {
	name: string
	handlers: Record<string, () => boolean>
	passthrough?: boolean
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

		if (key.escape) keyString = 'escape'
		else if (key.return) keyString = 'return'
		else if (key.tab) keyString = 'tab'
		else if (key.backspace || key.delete) keyString = 'backspace'
		else if (key.upArrow) keyString = 'up'
		else if (key.downArrow) keyString = 'down'
		else if (key.leftArrow) keyString = 'left'
		else if (key.rightArrow) keyString = 'right'

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
