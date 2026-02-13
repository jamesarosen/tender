import { useUi } from './context/UiContext.js'

/**
 * UI symbols that vary based on unicode support.
 * Centralizes the unicode/ASCII dictionary so every
 * rendering site draws from one source of truth.
 */
export interface Symbols {
	/** Key labels */
	enter: string
	tab: string
	esc: string
	/** Text symbols */
	ellipsis: string
}

const UNICODE_SYMBOLS: Symbols = {
	enter: '⏎',
	tab: '⇥',
	esc: 'Esc',
	ellipsis: '…',
}

const ASCII_SYMBOLS: Symbols = {
	enter: 'Ret',
	tab: 'Tab',
	esc: 'Esc',
	ellipsis: '...',
}

export function getSymbols(unicode: boolean): Symbols {
	return unicode ? UNICODE_SYMBOLS : ASCII_SYMBOLS
}

export function useSymbols(): Symbols {
	const { unicode } = useUi()
	return getSymbols(unicode)
}
