/**
 * Key labels that vary based on unicode support.
 */
export interface KeyLabels {
	enter: string
	tab: string
	esc: string
}

const UNICODE_LABELS: KeyLabels = {
	enter: '⏎',
	tab: '⇥',
	esc: 'Esc',
}

const ASCII_LABELS: KeyLabels = {
	enter: 'Ret',
	tab: 'Tab',
	esc: 'Esc',
}

export function getKeyLabels(unicode: boolean): KeyLabels {
	return unicode ? UNICODE_LABELS : ASCII_LABELS
}
