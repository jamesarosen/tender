import { useState, useCallback, type MutableRefObject } from 'react'
import { useInput } from 'ink'
import type { Task } from '@tender/db'
import { useApp, type UndoAction } from '#src/context/AppContext.js'

interface UseRewordOptions {
	task: Task | null | undefined
	rewordTask: (taskId: string, description: string) => Promise<void>
	showMessage: (msg: string) => void
	undoActionRef: MutableRefObject<UndoAction | null>
}

export function useReword({
	task,
	rewordTask,
	showMessage,
	undoActionRef,
}: UseRewordOptions) {
	const { state, startUndo, clearUndo, startEditing, stopEditing } = useApp()
	const [editValue, setEditValue] = useState('')

	const handleStartEdit = useCallback(() => {
		if (!task) return
		setEditValue(task.description)
		startEditing(task.id)
	}, [task, startEditing])

	const handleSaveEdit = useCallback(
		async (value: string) => {
			const taskId = state.editingTaskId
			if (!taskId) return

			const trimmed = value.trim()

			if (!trimmed) {
				showMessage('Task description cannot be empty')
				stopEditing()
				return
			}

			if (trimmed === task?.description) {
				stopEditing()
				return
			}

			const previousDescription = task?.description ?? ''

			// Clear any pending undo before starting a new one
			if (undoActionRef.current) {
				clearUndo()
			}

			try {
				await rewordTask(taskId, trimmed)
				startUndo({ kind: 'reword', taskId, previousDescription }, 5)
				showMessage('Reworded')
			} catch {
				showMessage('Failed to reword')
			} finally {
				stopEditing()
			}
		},
		[
			state.editingTaskId,
			task,
			rewordTask,
			startUndo,
			clearUndo,
			stopEditing,
			showMessage,
			undoActionRef,
		]
	)

	// Esc cancels edit
	useInput((_input, key) => {
		if (!state.editingTaskId) return
		if (key.escape) {
			stopEditing()
		}
	})

	return {
		editValue,
		setEditValue,
		handleStartEdit,
		handleSaveEdit,
		isEditing: !!state.editingTaskId,
	}
}
