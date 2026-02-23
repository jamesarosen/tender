/**
 * Tag and URL extraction from task descriptions.
 *
 * Tags are #-prefixed tokens matching #[A-Za-z][A-Za-z0-9_-]*.
 * They must be preceded by whitespace or appear at the start of the string,
 * which prevents matching URL fragments (e.g. example.com#section).
 *
 * URLs are http:// or https:// sequences. Trailing punctuation is excluded
 * so prose like "see https://example.com." parses correctly.
 */

/** Source pattern for a single #tag (without anchoring or global flag) */
const TAG_SOURCE = '(?<tag>(?<=^|\\s)#[A-Za-z][A-Za-z0-9_-]*)'

/** Source pattern for an HTTP(S) URL — greedy match, trimmed in post-processing */
const URL_SOURCE = '(?<url>https?://\\S+)'

/** Trailing characters to strip from URL matches (common prose punctuation) */
const URL_TRAILING_PUNCT = /[.,;:!?"')\]>]+$/

/** Combined pattern: URLs matched first to prevent #fragments becoming tags */
const SEGMENT_SOURCE = `${URL_SOURCE}|${TAG_SOURCE}`

export type TagSegment =
	| { type: 'text'; value: string }
	| { type: 'tag'; value: string }
	| { type: 'url'; value: string }

/**
 * Extracts unique tag names (without the # prefix) from a description string.
 * Returns tags in the order they first appear, deduplicated.
 *
 * Delegates to {@link parseTagSegments} so both functions share the same
 * URL-aware parsing logic.
 */
export function extractTags(description: string): string[] {
	const seen = new Set<string>()
	const tags: string[] = []
	for (const seg of parseTagSegments(description)) {
		if (seg.type === 'tag') {
			const tag = seg.value.slice(1) // remove #
			if (!seen.has(tag)) {
				seen.add(tag)
				tags.push(tag)
			}
		}
	}
	return tags
}

/**
 * Parses a description into alternating text, tag, and URL segments.
 * URLs are matched before tags so that URL fragments (e.g. #section) are
 * not mis-identified as tags.
 */
export function parseTagSegments(text: string): TagSegment[] {
	const re = new RegExp(SEGMENT_SOURCE, 'g')
	const segments: TagSegment[] = []
	let lastIndex = 0
	let match: RegExpExecArray | null

	while ((match = re.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
		}
		const type: 'url' | 'tag' = match.groups!.url ? 'url' : 'tag'
		let value = match[0]

		if (type === 'url') {
			value = value.replace(URL_TRAILING_PUNCT, '')
			// Rewind lastIndex so stripped punctuation becomes part of the next text segment
			re.lastIndex = match.index + value.length
		}

		segments.push({ type, value })
		lastIndex = re.lastIndex
	}

	if (lastIndex < text.length) {
		segments.push({ type: 'text', value: text.slice(lastIndex) })
	}

	return segments
}
