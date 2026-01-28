import { useState, useEffect } from 'react'
import { Text, useInput } from 'ink'

interface CursorProps {
	active: boolean
}

function Cursor({ active }: CursorProps) {
	const [visible, setVisible] = useState(true)

	useEffect(() => {
		if (!active) return

		const interval = setInterval(() => {
			setVisible((v) => !v)
		}, 500)

		return () => clearInterval(interval)
	}, [active])

	const show = visible && active

	return (
		<Text color={show ? 'cyan' : undefined} dimColor={!show}>
			_
		</Text>
	)
}

export interface TextInputProps {
	value: string
	onChange: (value: string) => void
	onSubmit?: (value: string) => void
	placeholder?: string
	focus?: boolean
}

export function TextInput({
	value,
	onChange,
	onSubmit,
	placeholder = '',
	focus = true,
}: TextInputProps) {
	useInput(
		(input, key) => {
			if (!focus) return

			if (key.return) {
				onSubmit?.(value)
				return
			}

			if (key.backspace || key.delete) {
				onChange(value.slice(0, -1))
				return
			}

			// Ignore control characters
			if (key.ctrl || key.meta) return

			// Add printable characters
			if (input && input.length === 1) {
				onChange(value + input)
			}
		},
		{ isActive: focus }
	)

	const displayValue = value || (placeholder ? '' : '')
	const showPlaceholder = !value && placeholder

	return (
		<Text>
			{showPlaceholder ? (
				<Text dimColor>{placeholder}</Text>
			) : (
				<Text>{displayValue}</Text>
			)}
			<Cursor active={focus} />
		</Text>
	)
}
