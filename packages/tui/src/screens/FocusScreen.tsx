import { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Kysely } from 'kysely'
import type { Database, Task } from '@tender/db'
import { recordSignal, deleteSignal } from '@tender/domain'
import { getDegradedResponse, formatResponse } from '@tender/agent'
import { TaskCard } from '#src/components/TaskCard.js'
import { Quote } from '#src/components/Quote.js'
import { ReflectionPrompt as ReflectionPromptComponent } from '#src/components/ReflectionPrompt.js'
import { useTasks, getTaskStats, type TaskStats } from '#src/hooks/useTasks.js'
import { useReflection } from '#src/hooks/useReflection.js'
import { useApp } from '#src/context/AppContext.js'
import { getRandomQuote } from '#src/data/quotes.js'

interface ReflectingTask {
	task: Task
	stats: TaskStats
}

export interface FocusScreenProps {
	db: Kysely<Database>
}

export function FocusScreen({ db }: FocusScreenProps) {
	const { tasks, loading, completeTask, uncompleteTask, startTask, refresh } =
		useTasks(db)
	const {
		navigate,
		pushModal,
		state,
		selectTask,
		startUndo,
		tickUndo,
		clearUndo,
		setUndoReflectionSignal,
	} = useApp()
	const { activePrompt, showReflection, dismissReflection } = useReflection()
	const [quote] = useState(getRandomQuote)
	const [message, setMessage] = useState<string | null>(null)
	const [taskStats, setTaskStats] = useState<TaskStats | null>(null)
	// Track the task we're reflecting on (keeps showing it until reflection is done)
	const [reflectingTask, setReflectingTask] = useState<ReflectingTask | null>(
		null
	)

	// If a task was selected from Day view, show that one; otherwise show first task
	const selectedTask = state.selectedTaskId
		? tasks.find((t) => t.id === state.selectedTaskId)
		: null
	const currentTask = selectedTask ?? tasks[0] ?? null
	// Show the reflecting task if we're in reflection mode, otherwise show current task
	const displayTask = reflectingTask?.task ?? currentTask
	const displayStats = reflectingTask?.stats ?? taskStats

	// Load stats when task changes
	useEffect(() => {
		if (currentTask) {
			getTaskStats(db, currentTask).then(setTaskStats)
		} else {
			setTaskStats(null)
		}
	}, [db, currentTask?.id])

	const showMessage = useCallback((msg: string) => {
		setMessage(msg)
		setTimeout(() => setMessage(null), 2000)
	}, [])

	const handleComplete = useCallback(async () => {
		if (!currentTask || !taskStats) return

		// Store task info before completing (for reflection)
		const taskToReflect = { task: currentTask, stats: taskStats }

		await completeTask(currentTask.id)
		const signal = await recordSignal(db, {
			taskId: currentTask.id,
			kind: 'completed',
		})

		// Clear selection so we return to priority order after this task
		selectTask(null)

		// Check if we should show reflection
		const shouldReflect = taskStats.deferralCount >= 2 || Math.random() < 0.2

		if (shouldReflect) {
			setReflectingTask(taskToReflect)
			showReflection('completion', taskStats)
		}

		// Start undo window: seconds=0 during reflection (paused), 5 otherwise
		startUndo(
			{
				taskId: currentTask.id,
				signalId: signal.id,
				reflectionSignalId: null,
			},
			shouldReflect ? 0 : 5
		)

		if (taskStats.deferralCount >= 2) {
			showMessage(
				formatResponse('taskCompletedWithName', {
					taskName: currentTask.description,
				})
			)
		} else {
			showMessage(getDegradedResponse('completionAcknowledged'))
		}
	}, [
		currentTask,
		taskStats,
		completeTask,
		db,
		selectTask,
		showReflection,
		showMessage,
		startUndo,
	])

	const handleSkip = useCallback(async () => {
		if (!currentTask || !taskStats) return

		// Store task info before skipping (for reflection)
		const taskToReflect = { task: currentTask, stats: taskStats }

		await recordSignal(db, {
			taskId: currentTask.id,
			kind: 'deferred',
		})

		// Clear selection so we return to priority order after this task
		selectTask(null)

		// Check if we should show reflection (on 2nd+ deferral)
		const shouldReflect = taskStats.deferralCount >= 1

		if (shouldReflect) {
			setReflectingTask(taskToReflect)
			showReflection('deferral', taskStats)
		}

		showMessage(getDegradedResponse('skipAcknowledged'))
		await refresh()
	}, [
		currentTask,
		taskStats,
		db,
		selectTask,
		showReflection,
		showMessage,
		refresh,
	])

	const handleStart = useCallback(async () => {
		if (!currentTask) return

		await startTask(currentTask.id)
		await recordSignal(db, {
			taskId: currentTask.id,
			kind: 'surfaced',
			payload: { acted_on: true },
		})
	}, [currentTask, startTask, db])

	// Ref to access undo action in callbacks without stale closures
	const undoActionRef = useRef(state.undoAction)
	useEffect(() => {
		undoActionRef.current = state.undoAction
	}, [state.undoAction])

	const handleReflectionSubmit = useCallback(
		async (text: string) => {
			const taskForReflection = reflectingTask?.task ?? currentTask
			if (!taskForReflection) return

			const reflectionSignal = await recordSignal(db, {
				taskId: taskForReflection.id,
				kind: 'reflection',
				payload: {
					text,
					moment: activePrompt?.trigger === 'completion' ? 'after' : 'before',
					prompt: activePrompt?.question,
				},
			})

			// Track reflection signal so undo can clean it up
			if (undoActionRef.current) {
				setUndoReflectionSignal(reflectionSignal.id)
			}

			showMessage(getDegradedResponse('reflectionRecorded'))
			setReflectingTask(null)
			dismissReflection()

			// Start fresh undo countdown now that reflection is done
			if (undoActionRef.current) {
				startUndo(
					{
						...undoActionRef.current,
						reflectionSignalId: reflectionSignal.id,
					},
					5
				)
			}
		},
		[
			reflectingTask,
			currentTask,
			db,
			activePrompt,
			showMessage,
			dismissReflection,
			setUndoReflectionSignal,
			startUndo,
		]
	)

	const handleReflectionSkip = useCallback(() => {
		setReflectingTask(null)
		dismissReflection()

		// Start fresh undo countdown now that reflection is done
		if (undoActionRef.current) {
			startUndo(undoActionRef.current, 5)
		}
	}, [dismissReflection, startUndo])

	const handleUndo = useCallback(async () => {
		const undo = undoActionRef.current
		if (!undo) return

		await uncompleteTask(undo.taskId)
		await deleteSignal(db, undo.signalId)
		if (undo.reflectionSignalId) {
			await deleteSignal(db, undo.reflectionSignalId)
		}

		clearUndo()
		setReflectingTask(null)
		dismissReflection()
		selectTask(undo.taskId)
		showMessage('Restored')
	}, [uncompleteTask, db, clearUndo, dismissReflection, selectTask, showMessage])

	// Separate useInput for undo keys — not gated behind activePrompt
	useInput((input, key) => {
		if (!state.undoAction) return

		if (activePrompt) {
			// During reflection: ctrl+u to undo
			if (key.ctrl && input === 'u') {
				handleUndo()
			}
		} else {
			// Normal mode: u to undo
			if (input === 'u') {
				handleUndo()
			}
		}
	})

	// Countdown interval: ticks only when undo is active and not in reflection
	useEffect(() => {
		if (!state.undoAction || state.undoSecondsLeft <= 0 || activePrompt) return

		const interval = setInterval(() => {
			tickUndo()
		}, 1000)

		return () => clearInterval(interval)
	}, [state.undoAction, state.undoSecondsLeft, activePrompt, tickUndo])

	useInput((input, key) => {
		// Don't handle keys when showing reflection prompt
		if (activePrompt) return

		if (input === 'c') {
			handleComplete()
		} else if (input === 's') {
			handleSkip()
		} else if (key.return) {
			handleStart()
		} else if (input === 'd') {
			navigate('day')
		} else if (input === 'a') {
			navigate('capture')
		} else if (input === '?') {
			pushModal('help')
		}
	})

	if (loading) {
		return (
			<Box flexDirection="column" alignItems="center" paddingY={2}>
				<Text dimColor>Loading...</Text>
			</Box>
		)
	}

	// Show "no tasks" only if there's no current task AND we're not reflecting
	if (!currentTask && !reflectingTask) {
		return (
			<Box flexDirection="column" paddingY={1}>
				<Quote quote={quote} />
				<Box flexDirection="column" alignItems="center" marginTop={2}>
					<Text>No tasks yet.</Text>
					<Box marginTop={1}>
						<Text dimColor>Press 'a' to add your first task.</Text>
					</Box>
				</Box>
			</Box>
		)
	}

	// Edge case: reflecting on last task that was just completed
	if (!displayTask) {
		return (
			<Box flexDirection="column" alignItems="center" paddingY={2}>
				<Text dimColor>Loading...</Text>
			</Box>
		)
	}

	return (
		<Box flexDirection="column" paddingY={1}>
			<Quote quote={quote} />
			<Box marginTop={1}>
				<TaskCard
					task={displayTask}
					daysSinceCreated={displayStats?.daysSinceCreated}
					showDetails={true}
				/>
			</Box>

			{displayTask.started_at && !reflectingTask && (
				<Box justifyContent="center" marginTop={1}>
					<Text color="green">In progress...</Text>
				</Box>
			)}

			{activePrompt && (
				<ReflectionPromptComponent
					question={activePrompt.question}
					onSubmit={handleReflectionSubmit}
					onSkip={handleReflectionSkip}
				/>
			)}

			{message && (
				<Box justifyContent="center" marginTop={1}>
					<Text color="gray">{message}</Text>
				</Box>
			)}
		</Box>
	)
}
