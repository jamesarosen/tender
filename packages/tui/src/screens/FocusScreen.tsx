import { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Kysely } from 'kysely'
import type { Database, Task } from '@tender/db'
import { recordSignal } from '@tender/domain'
import { getDegradedResponse, formatResponse } from '@tender/agent'
import { TaskCard } from '#src/components/TaskCard.js'
import { ReflectionPrompt as ReflectionPromptComponent } from '#src/components/ReflectionPrompt.js'
import { useTasks, getTaskStats, type TaskStats } from '#src/hooks/useTasks.js'
import { useReflection } from '#src/hooks/useReflection.js'
import { useApp } from '#src/context/AppContext.js'

interface ReflectingTask {
	task: Task
	stats: TaskStats
}

export interface FocusScreenProps {
	db: Kysely<Database>
}

export function FocusScreen({ db }: FocusScreenProps) {
	const { tasks, loading, completeTask, startTask, refresh } = useTasks(db)
	const { navigate, pushModal, state, selectTask } = useApp()
	const { activePrompt, showReflection, dismissReflection } = useReflection()
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
		await recordSignal(db, { taskId: currentTask.id, kind: 'completed' })

		// Clear selection so we return to priority order after this task
		selectTask(null)

		// Check if we should show reflection
		const shouldReflect = taskStats.deferralCount >= 2 || Math.random() < 0.2

		if (shouldReflect) {
			setReflectingTask(taskToReflect)
			showReflection('completion', taskStats)
		}

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

	const handleReflectionSubmit = useCallback(
		async (text: string) => {
			const taskForReflection = reflectingTask?.task ?? currentTask
			if (!taskForReflection) return

			await recordSignal(db, {
				taskId: taskForReflection.id,
				kind: 'reflection',
				payload: {
					text,
					moment: activePrompt?.trigger === 'completion' ? 'after' : 'before',
					prompt: activePrompt?.question,
				},
			})

			showMessage(getDegradedResponse('reflectionRecorded'))
			setReflectingTask(null)
			dismissReflection()
		},
		[
			reflectingTask,
			currentTask,
			db,
			activePrompt,
			showMessage,
			dismissReflection,
		]
	)

	const handleReflectionSkip = useCallback(() => {
		setReflectingTask(null)
		dismissReflection()
	}, [dismissReflection])

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
			<Box flexDirection="column" alignItems="center" paddingY={2}>
				<Text>No tasks yet.</Text>
				<Box marginTop={1}>
					<Text dimColor>Press 'a' to add your first task.</Text>
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
			<TaskCard
				task={displayTask}
				daysSinceCreated={displayStats?.daysSinceCreated}
				showDetails={true}
			/>

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
