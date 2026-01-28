import { Box } from 'ink'
import type { Kysely } from 'kysely'
import type { Database } from '@tender/db'
import type { LlmAvailabilityInput } from '@tender/agent'
import { DatabaseProvider } from './context/DatabaseContext.js'
import { AppProvider, useApp } from './context/AppContext.js'
import {
	AvailabilityProvider,
	useAvailability,
} from './context/AvailabilityContext.js'
import { StatusBar } from './components/StatusBar.js'
import { HelpOverlay } from './components/HelpOverlay.js'
import { FocusScreen } from './screens/FocusScreen.js'
import { DayScreen } from './screens/DayScreen.js'
import { CaptureScreen } from './screens/CaptureScreen.js'
import { FirstRunScreen } from './screens/FirstRunScreen.js'

export interface AppProps {
	db: Kysely<Database>
	availabilityInput: LlmAvailabilityInput
	isFirstRun?: boolean
}

function ScreenRouter({ db }: { db: Kysely<Database> }) {
	const { state } = useApp()

	switch (state.screen) {
		case 'first-run':
			return <FirstRunScreen db={db} />
		case 'focus':
			return <FocusScreen db={db} />
		case 'day':
			return <DayScreen db={db} />
		case 'capture':
			return <CaptureScreen db={db} />
		default:
			return <FocusScreen db={db} />
	}
}

function ModalLayer() {
	const { activeModal, popModal } = useApp()

	if (!activeModal) return null

	switch (activeModal) {
		case 'help':
			return <HelpOverlay onClose={popModal} />
		default:
			return null
	}
}

function StatusBarWithAvailability() {
	const { status, context } = useAvailability()
	const { state } = useApp()

	// Different hints for different screens
	const keyHints =
		state.screen === 'day'
			? '[j/k] navigate [Enter] focus [Esc] back'
			: state.screen === 'capture'
				? '[Enter] save [Tab] due date [Esc] cancel'
				: '[s]kip [c]omplete [d]ay [a]dd [?]'

	return (
		<StatusBar
			llmStatus={status}
			retryAfterMs={context.retryAfterMs}
			keyHints={keyHints}
		/>
	)
}

function AppContent({ db }: { db: Kysely<Database> }) {
	const { activeModal } = useApp()

	return (
		<Box flexDirection="column" minHeight={10}>
			<Box flexGrow={1}>
				{activeModal ? <ModalLayer /> : <ScreenRouter db={db} />}
			</Box>
			<StatusBarWithAvailability />
		</Box>
	)
}

export function App({ db, availabilityInput, isFirstRun = false }: AppProps) {
	return (
		<DatabaseProvider db={db}>
			<AvailabilityProvider input={availabilityInput}>
				<AppProvider isFirstRun={isFirstRun}>
					<AppContent db={db} />
				</AppProvider>
			</AvailabilityProvider>
		</DatabaseProvider>
	)
}
