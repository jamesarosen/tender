import { Box, Text } from 'ink'
import type { QuoteData } from '#src/data/quotes.js'

export interface QuoteProps {
	quote: QuoteData
}

export function Quote({ quote }: QuoteProps) {
	return (
		<Box flexDirection="column" paddingX={4} width={72}>
			<Box justifyContent="center">
				<Text dimColor italic wrap="wrap">
					{quote.text}
				</Text>
			</Box>
			{quote.author && (
				<Box justifyContent="flex-end" marginTop={1}>
					<Text dimColor italic>
						— {quote.author}
					</Text>
				</Box>
			)}
		</Box>
	)
}
