import { Box, Text } from 'ink'
import type { LlmAvailabilityStateValue } from '@tender/agent'

export interface StatusBarProps {
	llmStatus: LlmAvailabilityStateValue
	retryAfterMs?: number | null
	keyHints?: string
}

interface StatusDisplay {
	text: string
	color: string | undefined
	show: boolean
}

function getStatusDisplay(
	status: LlmAvailabilityStateValue,
	retryAfterMs?: number | null
): StatusDisplay {
	switch (status) {
		case 'disabled':
			return { text: '', color: undefined, show: false }
		case 'checking':
		case 'initializing':
			return { text: 'AI: ...', color: 'gray', show: true }
		case 'available':
			return { text: 'AI: Online', color: 'green', show: true }
		case 'keyMissing':
			return { text: 'AI: Key needed', color: 'yellow', show: true }
		case 'invalidKey':
			return { text: 'AI: Invalid key', color: 'red', show: true }
		case 'rateLimited': {
			const seconds = retryAfterMs ? Math.ceil(retryAfterMs / 1000) : '?'
			return { text: `AI: Limited (${seconds}s)`, color: 'yellow', show: true }
		}
		case 'serviceDown':
			return { text: 'AI: Offline', color: 'red', show: true }
		default:
			return { text: '', color: undefined, show: false }
	}
}

const DEFAULT_HINTS = '[s]kip [c]omplete [d]ay [a]dd [?]'

export function StatusBar({
	llmStatus,
	retryAfterMs,
	keyHints = DEFAULT_HINTS,
}: StatusBarProps) {
	const status = getStatusDisplay(llmStatus, retryAfterMs)

	return (
		<Box
			borderStyle="single"
			borderTop={true}
			borderBottom={false}
			borderLeft={false}
			borderRight={false}
			paddingX={1}
			justifyContent="space-between"
		>
			<Box>{status.show && <Text color={status.color}>{status.text}</Text>}</Box>
			<Box>
				<Text dimColor>{keyHints}</Text>
			</Box>
		</Box>
	)
}
