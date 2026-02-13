import { Box, Text, useInput } from 'ink'
import { useUi } from '#src/context/UiContext.js'
import { getKeyLabels, type KeyLabels } from '#src/keyLabels.js'

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

function globalKeys(keys: KeyLabels): KeyBinding[] {
	return [
		{ key: keys.esc, description: 'Go back / close' },
		{ key: '?', description: 'Toggle this help' },
	]
}

function focusKeys(keys: KeyLabels): KeyBinding[] {
	return [
		{ key: 's', description: 'Skip / defer task' },
		{ key: 'c', description: 'Complete task' },
		{ key: 'u', description: 'Undo complete (within 5s)' },
		{ key: '^u', description: 'Undo complete (during reflection)' },
		{ key: keys.enter, description: 'Start / stop task' },
		{ key: 'd', description: 'View day' },
		{ key: 'a', description: 'Add new task' },
	]
}

function dayKeys(keys: KeyLabels): KeyBinding[] {
	return [
		{ key: 'j / Down', description: 'Next task' },
		{ key: 'k / Up', description: 'Previous task' },
		{ key: keys.enter, description: 'Focus selected task' },
		{ key: 'x', description: 'Delete task' },
	]
}

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
	const { unicode } = useUi()
	const keys = getKeyLabels(unicode)

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

			<KeyGroup title="Global" keys={globalKeys(keys)} />
			<KeyGroup title="Focus View" keys={focusKeys(keys)} />
			<KeyGroup title="Day View" keys={dayKeys(keys)} />

			<Box marginTop={1}>
				<Text dimColor>Press {keys.esc} or ? to close</Text>
			</Box>
		</Box>
	)
}
