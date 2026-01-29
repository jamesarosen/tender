import { useState, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Kysely } from 'kysely'
import type { Database } from '@tender/db'
import { Field, Label } from '#src/components/Field.js'
import { TextInput } from '#src/components/TextInput.js'
import { useTasks } from '#src/hooks/useTasks.js'
import { useApp } from '#src/context/AppContext.js'

export interface FirstRunScreenProps {
	db: Kysely<Database>
}

export function FirstRunScreen({ db }: FirstRunScreenProps) {
	const { createTask } = useTasks(db)
	const { navigate, setFirstRun } = useApp()
	const [value, setValue] = useState('')
	const [step, setStep] = useState<'intro' | 'input'>('intro')

	const handleSubmit = useCallback(async () => {
		if (value.trim()) {
			await createTask(value.trim())
			setFirstRun(false)
			navigate('focus')
		}
	}, [value, createTask, setFirstRun, navigate])

	useInput((input, key) => {
		if (step === 'intro' && key.return) {
			setStep('input')
		}
	})

	if (step === 'intro') {
		return (
			<Box flexDirection="column" paddingY={2} paddingX={4}>
				<Box marginBottom={2}>
					<Text bold color="cyan">
						Welcome to Tender.
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>Most to-do apps show everything at once.</Text>
				</Box>
				<Box marginBottom={1}>
					<Text>Tender shows you one thing.</Text>
				</Box>
				<Box marginBottom={2}>
					<Text>The goal isn't to manage tasks—it's to actually do them.</Text>
				</Box>

				<Box marginTop={1}>
					<Text dimColor>Press Enter to continue...</Text>
				</Box>
			</Box>
		)
	}

	return (
		<Box flexDirection="column" paddingY={2} paddingX={4}>
			<Field marginBottom={2}>
				<Label>Let's start: What's one thing on your mind right now?</Label>
				<TextInput
					value={value}
					onChange={setValue}
					onSubmit={handleSubmit}
					placeholder="Enter your first task"
				/>
			</Field>

			<Box marginTop={2}>
				<Text dimColor>Press Enter to add this task and begin.</Text>
			</Box>
		</Box>
	)
}
