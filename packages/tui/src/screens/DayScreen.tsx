import { useState, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Kysely } from 'kysely'
import type { Database, Task } from '@tender/db'
import { getDegradedResponse } from '@tender/agent'
import { TaskListItem } from '../components/TaskCard.js'
import { useTasks } from '../hooks/useTasks.js'
import { useApp } from '../context/AppContext.js'

export interface DayScreenProps {
	db: Kysely<Database>
}

const MAX_VISIBLE_TASKS = 5

function groupTasks(tasks: Task[]): { today: Task[]; later: Task[] } {
	const now = new Date()
	const endOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		23,
		59,
		59
	)

	const today: Task[] = []
	const later: Task[] = []

	for (const task of tasks.slice(0, MAX_VISIBLE_TASKS)) {
		if (task.due_at && new Date(task.due_at) <= endOfToday) {
			today.push(task)
		} else {
			later.push(task)
		}
	}

	return { today, later }
}

export function DayScreen({ db }: DayScreenProps) {
	const { tasks, loading, deleteTask } = useTasks(db)
	const { navigate, selectTask } = useApp()
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [message, setMessage] = useState<string | null>(null)

	const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS)
	const { today, later } = groupTasks(tasks)

	const handleSelect = useCallback(() => {
		const task = visibleTasks[selectedIndex]
		if (task) {
			selectTask(task.id)
			navigate('focus')
		}
	}, [visibleTasks, selectedIndex, selectTask, navigate])

	const handleDelete = useCallback(async () => {
		const task = visibleTasks[selectedIndex]
		if (task) {
			await deleteTask(task.id)
			setMessage(getDegradedResponse('taskDeleted'))
			setTimeout(() => setMessage(null), 2000)
			// Adjust selection if we deleted the last item
			if (selectedIndex >= visibleTasks.length - 1 && selectedIndex > 0) {
				setSelectedIndex(selectedIndex - 1)
			}
		}
	}, [visibleTasks, selectedIndex, deleteTask])

	useInput((input, key) => {
		if (key.escape) {
			navigate('focus')
		} else if (key.return) {
			handleSelect()
		} else if (input === 'j' || key.downArrow) {
			setSelectedIndex((i) => Math.min(i + 1, visibleTasks.length - 1))
		} else if (input === 'k' || key.upArrow) {
			setSelectedIndex((i) => Math.max(i - 1, 0))
		} else if (input === 'x') {
			handleDelete()
		}
	})

	if (loading) {
		return (
			<Box flexDirection="column" alignItems="center" paddingY={2}>
				<Text dimColor>Loading...</Text>
			</Box>
		)
	}

	if (tasks.length === 0) {
		return (
			<Box flexDirection="column" alignItems="center" paddingY={2}>
				<Text>No tasks for today.</Text>
				<Box marginTop={1}>
					<Text dimColor>Press Esc to go back, 'a' to add a task.</Text>
				</Box>
			</Box>
		)
	}

	let displayIndex = 0

	return (
		<Box flexDirection="column" paddingY={1} paddingX={2}>
			<Box marginBottom={1}>
				<Text bold>Your Day</Text>
				<Text dimColor> ({tasks.length} tasks)</Text>
			</Box>

			{today.length > 0 && (
				<Box flexDirection="column" marginBottom={1}>
					<Text bold color="yellow">
						Today
					</Text>
					{today.map((task) => {
						const idx = displayIndex++
						return (
							<TaskListItem
								key={task.id}
								task={task}
								index={idx}
								selected={idx === selectedIndex}
							/>
						)
					})}
				</Box>
			)}

			{later.length > 0 && (
				<Box flexDirection="column">
					<Text bold dimColor>
						Later
					</Text>
					{later.map((task) => {
						const idx = displayIndex++
						return (
							<TaskListItem
								key={task.id}
								task={task}
								index={idx}
								selected={idx === selectedIndex}
							/>
						)
					})}
				</Box>
			)}

			{tasks.length > MAX_VISIBLE_TASKS && (
				<Box marginTop={1}>
					<Text dimColor>+{tasks.length - MAX_VISIBLE_TASKS} more tasks</Text>
				</Box>
			)}

			{message && (
				<Box marginTop={1}>
					<Text color="gray">{message}</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>j/k: navigate • Enter: focus • x: delete • Esc: back</Text>
			</Box>
		</Box>
	)
}
