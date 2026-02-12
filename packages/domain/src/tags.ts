/**
 * Tag extraction from task descriptions.
 *
 * Tags are #-prefixed tokens matching #[A-Za-z][A-Za-z0-9_-]*.
 * They must be preceded by whitespace or appear at the start of the string,
 * which prevents matching URL fragments (e.g. example.com#section).
 */

/** Source pattern for a single #tag (without anchoring or global flag) */
const TAG_SOURCE = '(?<=^|\\s)#[A-Za-z][A-Za-z0-9_-]*'

export type TagSegment =
	| { type: 'text'; value: string }
	| { type: 'tag'; value: string }

/**
 * Extracts unique tag names (without the # prefix) from a description string.
 * Returns tags in the order they first appear, deduplicated.
 */
export function extractTags(description: string): string[] {
	const re = new RegExp(TAG_SOURCE, 'g')
	const matches = description.match(re)
	if (!matches) return []

	const seen = new Set<string>()
	const tags: string[] = []
	for (const match of matches) {
		const tag = match.slice(1) // remove #
		if (!seen.has(tag)) {
			seen.add(tag)
			tags.push(tag)
		}
	}
	return tags
}

/**
 * Parses a description into alternating text and tag segments.
 */
export function parseTagSegments(text: string): TagSegment[] {
	const re = new RegExp(TAG_SOURCE, 'g')
	const segments: TagSegment[] = []
	let lastIndex = 0
	let match: RegExpExecArray | null

	while ((match = re.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
		}
		segments.push({ type: 'tag', value: match[0] })
		lastIndex = re.lastIndex
	}

	if (lastIndex < text.length) {
		segments.push({ type: 'text', value: text.slice(lastIndex) })
	}

	return segments
}
