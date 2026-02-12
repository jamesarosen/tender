import { useMemo } from 'react'
import { Text } from 'ink'
import { parseTagSegments } from '@tender/domain'

/**
 * Terminal-safe tag colors. These 6 ANSI colors remain readable
 * across common terminal themes (see README.md color guidelines).
 */
const TAG_COLORS = [
	'red',
	'green',
	'yellow',
	'blue',
	'magenta',
	'cyan',
] as const

/**
 * Simple string hash (djb2) mapped to a tag color index.
 * Produces stable, well-distributed results across the palette.
 */
export function tagColorIndex(tag: string): number {
	let hash = 5381
	for (let i = 0; i < tag.length; i++) {
		hash = ((hash << 5) + hash + tag.charCodeAt(i)) >>> 0
	}
	return hash % TAG_COLORS.length
}

export function tagColor(tag: string): (typeof TAG_COLORS)[number] {
	return TAG_COLORS[tagColorIndex(tag)]
}

export interface TagTextProps {
	children: string
	bold?: boolean
}

/**
 * Renders a description string with inline #tags highlighted in stable colors.
 * Non-tag text inherits parent styling; tags get their hash-based color.
 */
export function TagText({ children, bold }: TagTextProps) {
	const segments = useMemo(() => parseTagSegments(children), [children])

	if (segments.length === 1 && segments[0].type === 'text') {
		return (
			<Text bold={bold} wrap="wrap">
				{children}
			</Text>
		)
	}

	return (
		<Text bold={bold} wrap="wrap">
			{segments.map((seg, i) =>
				seg.type === 'tag' ? (
					<Text
						key={`${seg.type}-${i}`}
						color={tagColor(seg.value.slice(1))}
						bold={false}
					>
						{seg.value}
					</Text>
				) : (
					seg.value
				)
			)}
		</Text>
	)
}
