import { useState } from 'react'
import { Box, Text } from 'ink'
import { TextInput } from './TextInput.js'

export interface ReflectionPromptProps {
	question: string
	onSubmit: (text: string) => void
	onSkip: () => void
}

export function ReflectionPrompt({
	question,
	onSubmit,
	onSkip,
}: ReflectionPromptProps) {
	const [value, setValue] = useState('')

	const handleSubmit = (text: string) => {
		if (text.trim()) {
			onSubmit(text.trim())
		} else {
			onSkip()
		}
	}

	return (
		<Box flexDirection="column" marginTop={1} paddingX={2}>
			<Box borderStyle="single" borderColor="gray" paddingX={1}>
				<Text dimColor>─────────────────────────────────────</Text>
			</Box>

			<Box marginTop={1}>
				<Text italic color="cyan">
					"{question}"
				</Text>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>{'> '}</Text>
				<TextInput
					value={value}
					onChange={setValue}
					onSubmit={handleSubmit}
					placeholder="(Enter to skip)"
				/>
			</Box>
		</Box>
	)
}
