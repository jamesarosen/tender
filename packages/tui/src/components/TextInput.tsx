import { useState, useEffect } from 'react'
import { Text, useInput } from 'ink'
import { hasModifier } from '#src/hooks/useKeymap.js'

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

			if (hasModifier(key)) return

			// Accept printable characters; handles paste (multi-char) by collapsing newlines to spaces
			if (input) {
				const cleaned = input.replace(/[\r\n]+/g, ' ')
				onChange(value + cleaned)
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
				<>
					<Text>{displayValue}</Text>
					<Cursor active={focus} />
				</>
			)}
		</Text>
	)
}
