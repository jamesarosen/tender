import { Box } from 'ink'
import type { Kysely } from 'kysely'
import type { Database } from '@tender/db'
import type { LlmAvailabilityInput } from '@tender/agent'
import { DatabaseProvider } from './context/DatabaseContext.js'
import {
	AppProvider,
	useApp,
	type Screen,
	type ModalType,
} from './context/AppContext.js'
import {
	AvailabilityProvider,
	useAvailability,
} from './context/AvailabilityContext.js'
import { UiProvider } from './context/UiContext.js'
import { useSymbols } from './symbols.js'
import { useTerminalTitle } from './hooks/useTerminalTitle.js'
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
	unicode?: boolean
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
	const sym = useSymbols()

	// Different hints for different screens
	let keyHints: string
	switch (state.screen) {
		case 'day':
			keyHints = `[j/k] navigate | [${sym.enter}] focus | [c]omplete | [x] delete | [a]dd`
			break
		case 'capture':
			keyHints = `[${sym.enter}] save | [${sym.tab}] due date | [${sym.esc}] cancel`
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

function terminalTitle(screen: Screen, modal: ModalType | null): string {
	if (modal === 'help') return 'Tender / Keyboard Shortcuts'
	switch (screen) {
		case 'day':
			return 'Tender / Day'
		case 'capture':
			return 'Tender / New Task'
		case 'first-run':
			return 'Tender / Welcome'
		case 'focus':
		default:
			return 'Tender'
	}
}

function AppContent({ db }: { db: Kysely<Database> }) {
	const { activeModal, state } = useApp()
	useTerminalTitle(terminalTitle(state.screen, activeModal))

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

export function App({
	db,
	availabilityInput,
	isFirstRun = false,
	unicode = false, // safe fallback; production callers pass config.ui.unicode
}: AppProps) {
	return (
		<DatabaseProvider db={db}>
			<UiProvider unicode={unicode}>
				<AvailabilityProvider input={availabilityInput}>
					<AppProvider isFirstRun={isFirstRun}>
						<AppContent db={db} />
					</AppProvider>
				</AvailabilityProvider>
			</UiProvider>
		</DatabaseProvider>
	)
}
