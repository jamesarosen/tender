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

function getUndoHint(
	state: import('./context/AppContext.js').AppState
): string | null {
	if (!state.undoAction) return null
	if (state.undoSecondsLeft <= 0) return '[^u]ndo'
	return `[u]ndo/${state.undoSecondsLeft}`
}

function StatusBarWithAvailability() {
	const { status, context } = useAvailability()
	const { state } = useApp()

	// Different hints for different screens
	let keyHints: string
	switch (state.screen) {
		case 'day':
			keyHints =
				'[j/k] navigate | [Enter] focus | [c]omplete | [x] delete | [a]dd | [Esc] back'
			break
		case 'capture':
			keyHints = '[Enter] save | [Tab] due date | [Esc] cancel'
			break
		case 'focus':
		case 'first-run':
		default:
			keyHints = '[s]kip | [c]omplete | [d]ay | [a]dd | [?]'
			break
	}

	return (
		<StatusBar
			llmStatus={status}
			retryAfterMs={context.retryAfterMs}
			keyHints={keyHints}
			undoHint={getUndoHint(state)}
		/>
	)
}

function AppContent({ db }: { db: Kysely<Database> }) {
	const { activeModal } = useApp()

	return (
		<Box flexDirection="column" minHeight={10}>
			<Box flexGrow={1}>
				{activeModal && <ModalLayer />}
				<Box display={activeModal ? 'none' : 'flex'} flexGrow={1}>
					<ScreenRouter db={db} />
				</Box>
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
