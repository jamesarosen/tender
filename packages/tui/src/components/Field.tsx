import { Box, Text } from 'ink'
import type { ComponentProps } from 'react'

type BoxProps = ComponentProps<typeof Box>

type LabelProps = BoxProps

export function Label({ children, ...props }: LabelProps) {
	return (
		<Box flexShrink={0} {...props}>
			<Text>{children}</Text>
		</Box>
	)
}

type FieldProps = BoxProps

export function Field({ children, ...props }: FieldProps) {
	return (
		<Box gap={1} {...props}>
			{children}
		</Box>
	)
}
