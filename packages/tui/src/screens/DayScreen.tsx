import { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Kysely } from 'kysely'
import type { Database, Task } from '@tender/db'
import { recordSignal, deleteSignal } from '@tender/domain'
import { getDegradedResponse } from '@tender/agent'
import { TaskListItem } from '#src/components/TaskCard.js'
import { TextInput } from '#src/components/TextInput.js'
import { useTasks } from '#src/hooks/useTasks.js'
import { useReword } from '#src/hooks/useReword.js'
import { useApp } from '#src/context/AppContext.js'
import { hasModifier } from '#src/hooks/useKeymap.js'
import { useSymbols } from '#src/symbols.js'

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
	const {
		tasks,
		loading,
		deleteTask,
		undeleteTask,
		completeTask,
		uncompleteTask,
		rewordTask,
	} = useTasks(db)
	const { navigate, selectTask, state, startUndo, tickUndo, clearUndo } =
		useApp()
	const sym = useSymbols()
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [message, setMessage] = useState<string | null>(null)

	const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS)
	const { today, later } = groupTasks(tasks)

	// Ref to access undo action in callbacks without stale closures
	const undoActionRef = useRef(state.undoAction)
	useEffect(() => {
		undoActionRef.current = state.undoAction
	}, [state.undoAction])

	const showMessage = useCallback((msg: string) => {
		setMessage(msg)
		setTimeout(() => setMessage(null), 2000)
	}, [])

	const selectedTask = visibleTasks[selectedIndex] ?? null

	const { editValue, setEditValue, handleStartEdit, handleSaveEdit, isEditing } =
		useReword({
			task: selectedTask,
			rewordTask,
			showMessage,
			undoActionRef,
		})

	const handleSelect = useCallback(() => {
		const task = visibleTasks[selectedIndex]
		if (task) {
			selectTask(task.id)
			navigate('focus')
		}
	}, [visibleTasks, selectedIndex, selectTask, navigate])

	const handleTaskAction = useCallback(
		async (
			perform: (taskId: string) => Promise<void>,
			kind: 'delete' | 'complete',
			signalKind: 'deleted' | 'completed',
			messageKey: string
		) => {
			const task = visibleTasks[selectedIndex]
			if (!task) return

			// Finalize any pending undo before starting a new one
			if (undoActionRef.current) {
				clearUndo()
			}

			try {
				await perform(task.id)
				const signal = await recordSignal(db, {
					taskId: task.id,
					kind: signalKind,
				})
				startUndo(
					{
						taskId: task.id,
						signalId: signal.id,
						reflectionSignalId: null,
						kind,
					},
					5
				)
				showMessage(getDegradedResponse(messageKey))
				// Adjust selection if we removed the last item
				if (selectedIndex >= visibleTasks.length - 1 && selectedIndex > 0) {
					setSelectedIndex(selectedIndex - 1)
				}
			} catch {
				showMessage(`Failed to ${kind} task`)
			}
		},
		[visibleTasks, selectedIndex, db, startUndo, clearUndo, showMessage]
	)

	const handleDelete = useCallback(
		() => handleTaskAction(deleteTask, 'delete', 'deleted', 'taskDeleted'),
		[handleTaskAction, deleteTask]
	)

	const handleComplete = useCallback(
		() =>
			handleTaskAction(
				completeTask,
				'complete',
				'completed',
				'completionAcknowledged'
			),
		[handleTaskAction, completeTask]
	)

	const handleUndo = useCallback(async () => {
		const undo = undoActionRef.current
		if (!undo) return

		try {
			if (undo.kind === 'reword') {
				await rewordTask(undo.taskId, undo.previousDescription)
			} else {
				if (undo.kind === 'delete') {
					await undeleteTask(undo.taskId)
				} else {
					await uncompleteTask(undo.taskId)
				}
				await deleteSignal(db, undo.signalId)
				if (undo.reflectionSignalId) {
					await deleteSignal(db, undo.reflectionSignalId)
				}
			}
			showMessage('Restored')
		} catch {
			showMessage('Failed to undo')
		} finally {
			clearUndo()
		}
	}, [rewordTask, undeleteTask, uncompleteTask, db, clearUndo, showMessage])

	// Undo key handler
	useInput((input, key) => {
		if (isEditing) return
		if (hasModifier(key)) return
		if (!state.undoAction) return
		if (input === 'u') {
			handleUndo()
		}
	})

	// Countdown interval: ticks while undo is active
	useEffect(() => {
		if (!state.undoAction || state.undoSecondsLeft <= 0) return

		const interval = setInterval(() => {
			tickUndo()
		}, 1000)

		return () => clearInterval(interval)
	}, [state.undoAction, state.undoSecondsLeft, tickUndo])

	useInput((input, key) => {
		if (isEditing) return
		if (key.return) {
			handleSelect()
		} else if (key.downArrow || (!hasModifier(key) && input === 'j')) {
			setSelectedIndex((i) => Math.min(i + 1, visibleTasks.length - 1))
		} else if (key.upArrow || (!hasModifier(key) && input === 'k')) {
			setSelectedIndex((i) => Math.max(i - 1, 0))
		} else if (hasModifier(key)) {
			return
		} else if (input === 'c') {
			handleComplete()
		} else if (input === 'x') {
			handleDelete()
		} else if (input === 'w') {
			handleStartEdit()
		} else if (input === 'a') {
			navigate('capture')
		}
	})

	if (loading) {
		return (
			<Box flexDirection="column" alignItems="center" paddingY={2}>
				<Text dimColor>Loading{sym.ellipsis}</Text>
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

	const renderTask = (task: Task) => {
		const idx = displayIndex++
		if (state.editingTaskId === task.id) {
			return (
				<Box key={task.id} flexDirection="column">
					<Text dimColor>Reword:</Text>
					<Box>
						<Text color="cyan" bold>
							{'> '}
							{idx + 1}.{' '}
						</Text>
						<TextInput
							value={editValue}
							onChange={setEditValue}
							onSubmit={handleSaveEdit}
						/>
					</Box>
				</Box>
			)
		}
		return (
			<TaskListItem
				key={task.id}
				task={task}
				index={idx}
				selected={idx === selectedIndex}
			/>
		)
	}

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
					{today.map(renderTask)}
				</Box>
			)}

			{later.length > 0 && (
				<Box flexDirection="column">
					<Text bold dimColor>
						Later
					</Text>
					{later.map(renderTask)}
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
		</Box>
	)
}
