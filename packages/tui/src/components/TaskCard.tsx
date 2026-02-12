import { Box, Text } from 'ink'
import type { Task } from '@tender/db'
import { extractTags } from '@tender/domain'
import { TagText, tagColor } from './TagText.js'

export interface TaskCardProps {
	task: Task
	daysSinceCreated?: number
	showDetails?: boolean
}

function formatDueDate(dueAt: string | null): string | null {
	if (!dueAt) return null

	const due = new Date(dueAt)
	const now = new Date()
	const diffMs = due.getTime() - now.getTime()
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
	if (diffDays === 0) return 'Today'
	if (diffDays === 1) return 'Tomorrow'
	if (diffDays < 7) return `In ${diffDays} days`
	return due.toLocaleDateString()
}

function formatAge(days: number): string {
	if (days === 0) return 'new'
	if (days === 1) return '1 day old'
	return `${days} days old`
}

export function TaskCard({
	task,
	daysSinceCreated = 0,
	showDetails = true,
}: TaskCardProps) {
	const dueDisplay = formatDueDate(task.due_at)
	const ageDisplay = formatAge(daysSinceCreated)

	// Tags that appear inline as #tag in description don't need badges
	const inlineTags = new Set(extractTags(task.description))
	const badgeTags = task.tags.filter((tag) => !inlineTags.has(tag))

	return (
		<Box flexDirection="column" paddingX={2}>
			<Box justifyContent="center">
				<Text bold wrap="wrap">
					"<TagText bold>{task.description}</TagText>"
				</Text>
			</Box>

			{showDetails && (
				<>
					<Box marginTop={1} justifyContent="center">
						{dueDisplay && (
							<Text dimColor>
								Due: {dueDisplay}
								{daysSinceCreated > 0 ? '  •  ' : ''}
							</Text>
						)}
						{daysSinceCreated > 0 && <Text dimColor>{ageDisplay}</Text>}
					</Box>

					{badgeTags.length > 0 && (
						<Box marginTop={1} justifyContent="center" gap={1}>
							{badgeTags.map((tag) => (
								<Text key={tag} color={tagColor(tag)}>
									[{tag}]
								</Text>
							))}
						</Box>
					)}
				</>
			)}
		</Box>
	)
}

export interface TaskListItemProps {
	task: Task
	selected?: boolean
	index: number
}

export function TaskListItem({
	task,
	selected = false,
	index,
}: TaskListItemProps) {
	const prefix = selected ? '>' : ' '
	const dueDisplay = formatDueDate(task.due_at)

	return (
		<Box>
			<Text color={selected ? 'cyan' : undefined} bold={selected}>
				{prefix} {index + 1}.{' '}
			</Text>
			<TagText bold={selected}>{task.description}</TagText>
			{dueDisplay && <Text dimColor> ({dueDisplay})</Text>}
		</Box>
	)
}
