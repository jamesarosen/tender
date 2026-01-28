import { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Kysely } from 'kysely'
import type { Database } from '@tender/db'
import { recordSignal } from '@tender/domain'
import { getDegradedResponse, formatResponse } from '@tender/agent'
import { TaskCard } from '../components/TaskCard.js'
import { ReflectionPrompt as ReflectionPromptComponent } from '../components/ReflectionPrompt.js'
import { useTasks, getTaskStats, type TaskStats } from '../hooks/useTasks.js'
import { useReflection } from '../hooks/useReflection.js'
import { useApp } from '../context/AppContext.js'

export interface FocusScreenProps {
	db: Kysely<Database>
}

export function FocusScreen({ db }: FocusScreenProps) {
	const { tasks, loading, completeTask, startTask, refresh } = useTasks(db)
	const { navigate, pushModal } = useApp()
	const { activePrompt, showReflection, dismissReflection } = useReflection()
	const [message, setMessage] = useState<string | null>(null)
	const [taskStats, setTaskStats] = useState<TaskStats | null>(null)

	const currentTask = tasks[0] ?? null

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

		await completeTask(currentTask.id)
		await recordSignal(db, { taskId: currentTask.id, kind: 'completed' })

		showReflection('completion', taskStats)

		if (taskStats.deferralCount >= 2) {
			showMessage(
				formatResponse('taskCompletedWithName', {
					taskName: currentTask.description,
				})
			)
		} else {
			showMessage(getDegradedResponse('completionAcknowledged'))
		}
	}, [currentTask, taskStats, completeTask, db, showReflection, showMessage])

	const handleSkip = useCallback(async () => {
		if (!currentTask || !taskStats) return

		await recordSignal(db, {
			taskId: currentTask.id,
			kind: 'deferred',
		})

		showReflection('deferral', taskStats)
		showMessage(getDegradedResponse('skipAcknowledged'))
		await refresh()
	}, [currentTask, taskStats, db, showReflection, showMessage, refresh])

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
			if (!currentTask) return

			await recordSignal(db, {
				taskId: currentTask.id,
				kind: 'reflection',
				payload: {
					text,
					moment: activePrompt?.trigger === 'completion' ? 'after' : 'before',
					prompt: activePrompt?.question,
				},
			})

			showMessage(getDegradedResponse('reflectionRecorded'))
			dismissReflection()
		},
		[currentTask, db, activePrompt, showMessage, dismissReflection]
	)

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

	if (!currentTask) {
		return (
			<Box flexDirection="column" alignItems="center" paddingY={2}>
				<Text>No tasks yet.</Text>
				<Box marginTop={1}>
					<Text dimColor>Press 'a' to add your first task.</Text>
				</Box>
			</Box>
		)
	}

	return (
		<Box flexDirection="column" paddingY={1}>
			<TaskCard
				task={currentTask}
				daysSinceCreated={taskStats?.daysSinceCreated}
				showDetails={true}
			/>

			{currentTask.started_at && (
				<Box justifyContent="center" marginTop={1}>
					<Text color="green">In progress...</Text>
				</Box>
			)}

			{activePrompt && (
				<ReflectionPromptComponent
					question={activePrompt.question}
					onSubmit={handleReflectionSubmit}
					onSkip={dismissReflection}
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
