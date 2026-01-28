import { Box, Text, useInput } from 'ink'

export interface HelpOverlayProps {
	onClose: () => void
}

function useHelpInput(onClose: () => void) {
	useInput((input, key) => {
		if (key.escape || input === '?') {
			onClose()
		}
	})
}

interface KeyBinding {
	key: string
	description: string
}

const GLOBAL_KEYS: KeyBinding[] = [
	{ key: 'Esc', description: 'Go back / close' },
	{ key: '?', description: 'Toggle this help' },
]

const FOCUS_KEYS: KeyBinding[] = [
	{ key: 's', description: 'Skip / defer task' },
	{ key: 'c', description: 'Complete task' },
	{ key: 'Enter', description: 'Start / stop task' },
	{ key: 'd', description: 'View day' },
	{ key: 'a', description: 'Add new task' },
]

const DAY_KEYS: KeyBinding[] = [
	{ key: 'j / Down', description: 'Next task' },
	{ key: 'k / Up', description: 'Previous task' },
	{ key: 'Enter', description: 'Focus selected task' },
]

function KeyGroup({ title, keys }: { title: string; keys: KeyBinding[] }) {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text bold underline>
				{title}
			</Text>
			{keys.map(({ key, description }) => (
				<Box key={key} gap={2}>
					<Box width={12}>
						<Text color="cyan">{key}</Text>
					</Box>
					<Text>{description}</Text>
				</Box>
			))}
		</Box>
	)
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
	useHelpInput(onClose)

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="gray"
			paddingX={2}
			paddingY={1}
		>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Keyboard Shortcuts
				</Text>
			</Box>

			<KeyGroup title="Global" keys={GLOBAL_KEYS} />
			<KeyGroup title="Focus View" keys={FOCUS_KEYS} />
			<KeyGroup title="Day View" keys={DAY_KEYS} />

			<Box marginTop={1}>
				<Text dimColor>Press Esc or ? to close</Text>
			</Box>
		</Box>
	)
}
