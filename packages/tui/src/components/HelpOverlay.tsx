import { Box, Text, useInput } from 'ink'
import { useSymbols, type Symbols } from '#src/symbols.js'

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

function globalKeys(sym: Symbols): KeyBinding[] {
	return [
		{ key: sym.esc, description: 'Go back / close' },
		{ key: '?', description: 'Toggle this help' },
	]
}

function focusKeys(sym: Symbols): KeyBinding[] {
	return [
		{ key: 's', description: 'Skip / defer task' },
		{ key: 'c', description: 'Complete task' },
		{ key: 'w', description: 'Reword task' },
		{ key: 'u', description: 'Undo (within 5s)' },
		{ key: '^u', description: 'Undo (during reflection)' },
		{ key: sym.enter, description: 'Start / stop task' },
		{ key: 'd', description: 'View day' },
		{ key: 'a', description: 'Add new task' },
	]
}

function dayKeys(sym: Symbols): KeyBinding[] {
	return [
		{ key: 'j / Down', description: 'Next task' },
		{ key: 'k / Up', description: 'Previous task' },
		{ key: sym.enter, description: 'Focus selected task' },
		{ key: 'c', description: 'Complete task' },
		{ key: 'w', description: 'Reword task' },
		{ key: 'x', description: 'Delete task' },
		{ key: 'u', description: 'Undo (within 5s)' },
		{ key: 'a', description: 'Add new task' },
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
	const sym = useSymbols()

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

			<KeyGroup title="Global" keys={globalKeys(sym)} />
			<KeyGroup title="Focus View" keys={focusKeys(sym)} />
			<KeyGroup title="Day View" keys={dayKeys(sym)} />

			<Box marginTop={1}>
				<Text dimColor>Press {sym.esc} or ? to close</Text>
			</Box>
		</Box>
	)
}
