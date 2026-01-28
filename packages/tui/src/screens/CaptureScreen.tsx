import { useState, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Kysely } from 'kysely'
import type { Database } from '@tender/db'
import { getDegradedResponse } from '@tender/agent'
import { TextInput } from '../components/TextInput.js'
import { useTasks } from '../hooks/useTasks.js'
import { useApp } from '../context/AppContext.js'

export interface CaptureScreenProps {
	db: Kysely<Database>
}

type CaptureMode = 'description' | 'due'

export function CaptureScreen({ db }: CaptureScreenProps) {
	const { createTask } = useTasks(db)
	const { navigate } = useApp()
	const [description, setDescription] = useState('')
	const [dueDate, setDueDate] = useState('')
	const [mode, setMode] = useState<CaptureMode>('description')
	const [message, setMessage] = useState<string | null>(null)

	const handleSubmit = useCallback(async () => {
		if (!description.trim()) {
			navigate('focus')
			return
		}

		// Parse due date if provided
		let dueAt: string | undefined
		if (dueDate.trim()) {
			// Simple parsing: "tomorrow", "today", or ISO date
			const lower = dueDate.toLowerCase().trim()
			const now = new Date()

			if (lower === 'today') {
				dueAt = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate(),
					23,
					59,
					59
				).toISOString()
			} else if (lower === 'tomorrow') {
				dueAt = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate() + 1,
					23,
					59,
					59
				).toISOString()
			} else {
				// Try to parse as date
				const parsed = new Date(dueDate)
				if (!isNaN(parsed.getTime())) {
					dueAt = parsed.toISOString()
				}
			}
		}

		await createTask(description.trim(), dueAt)
		setMessage(getDegradedResponse('taskCreated'))

		// Brief delay to show message, then return to focus
		setTimeout(() => navigate('focus'), 500)
	}, [description, dueDate, createTask, navigate])

	useInput((input, key) => {
		if (key.escape) {
			navigate('focus')
		} else if (key.tab && mode === 'description') {
			// Tab to expand options
			setMode('due')
		} else if (key.return) {
			if (mode === 'description') {
				handleSubmit()
			} else if (mode === 'due') {
				handleSubmit()
			}
		}
	})

	return (
		<Box flexDirection="column" paddingY={1} paddingX={2}>
			<Box marginBottom={1}>
				<Text bold>Add Task</Text>
			</Box>

			<Box>
				<Text>What needs doing? </Text>
				{mode === 'description' ? (
					<TextInput
						value={description}
						onChange={setDescription}
						onSubmit={handleSubmit}
						placeholder="Enter task description"
						focus={mode === 'description'}
					/>
				) : (
					<Text>{description}</Text>
				)}
			</Box>

			{mode === 'due' && (
				<Box marginTop={1}>
					<Text>Due: </Text>
					<TextInput
						value={dueDate}
						onChange={setDueDate}
						onSubmit={handleSubmit}
						placeholder="today, tomorrow, or YYYY-MM-DD"
						focus={mode === 'due'}
					/>
				</Box>
			)}

			{message && (
				<Box marginTop={1}>
					<Text color="green">{message}</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>
					{mode === 'description'
						? 'Enter: save • Tab: set due date • Esc: cancel'
						: 'Enter: save • Esc: cancel'}
				</Text>
			</Box>
		</Box>
	)
}
