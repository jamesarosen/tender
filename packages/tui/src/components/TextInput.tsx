import { useState, useEffect } from 'react'
import { Text, useInput } from 'ink'

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
	const [cursorVisible, setCursorVisible] = useState(true)

	// Blink cursor
	useEffect(() => {
		if (!focus) return

		const interval = setInterval(() => {
			setCursorVisible((v) => !v)
		}, 500)

		return () => clearInterval(interval)
	}, [focus])

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
	const cursor = cursorVisible && focus ? '_' : ' '

	return (
		<Text>
			{showPlaceholder ? (
				<Text dimColor>{placeholder}</Text>
			) : (
				<Text>{displayValue}</Text>
			)}
			<Text color="cyan">{cursor}</Text>
		</Text>
	)
}
