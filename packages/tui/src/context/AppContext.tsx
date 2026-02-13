import { createContext, useContext, useReducer, type ReactNode } from 'react'

export type Screen = 'focus' | 'day' | 'capture' | 'first-run'
export type ModalType = 'help' | 'reflection'

export interface UndoAction {
	taskId: string
	signalId: string
	reflectionSignalId: string | null
	kind: 'complete' | 'delete'
}

export interface AppState {
	screen: Screen
	selectedTaskId: string | null
	modalStack: ModalType[]
	isFirstRun: boolean
	undoAction: UndoAction | null
	undoSecondsLeft: number
}

type AppAction =
	| { type: 'NAVIGATE'; screen: Screen }
	| { type: 'SELECT_TASK'; taskId: string | null }
	| { type: 'PUSH_MODAL'; modal: ModalType }
	| { type: 'POP_MODAL' }
	| { type: 'CLEAR_MODALS' }
	| { type: 'SET_FIRST_RUN'; isFirstRun: boolean }
	| { type: 'START_UNDO'; action: UndoAction; seconds: number }
	| { type: 'TICK_UNDO' }
	| { type: 'CLEAR_UNDO' }
	| { type: 'SET_UNDO_REFLECTION_SIGNAL'; signalId: string }

function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case 'NAVIGATE':
			return {
				...state,
				screen: action.screen,
				modalStack: [],
				undoAction: null,
				undoSecondsLeft: 0,
			}
		case 'SELECT_TASK':
			return { ...state, selectedTaskId: action.taskId }
		case 'PUSH_MODAL':
			return { ...state, modalStack: [...state.modalStack, action.modal] }
		case 'POP_MODAL':
			return { ...state, modalStack: state.modalStack.slice(0, -1) }
		case 'CLEAR_MODALS':
			return { ...state, modalStack: [] }
		case 'SET_FIRST_RUN':
			return { ...state, isFirstRun: action.isFirstRun }
		case 'START_UNDO':
			return {
				...state,
				undoAction: action.action,
				undoSecondsLeft: action.seconds,
			}
		case 'TICK_UNDO':
			if (state.undoSecondsLeft <= 1) {
				return { ...state, undoAction: null, undoSecondsLeft: 0 }
			}
			return { ...state, undoSecondsLeft: state.undoSecondsLeft - 1 }
		case 'CLEAR_UNDO':
			return { ...state, undoAction: null, undoSecondsLeft: 0 }
		case 'SET_UNDO_REFLECTION_SIGNAL':
			if (!state.undoAction) return state
			return {
				...state,
				undoAction: {
					...state.undoAction,
					reflectionSignalId: action.signalId,
				},
			}
		default:
			return state
	}
}

interface AppContextValue {
	state: AppState
	navigate: (screen: Screen) => void
	selectTask: (taskId: string | null) => void
	pushModal: (modal: ModalType) => void
	popModal: () => void
	clearModals: () => void
	setFirstRun: (isFirstRun: boolean) => void
	startUndo: (action: UndoAction, seconds?: number) => void
	tickUndo: () => void
	clearUndo: () => void
	setUndoReflectionSignal: (signalId: string) => void
	activeModal: ModalType | null
}

const AppContext = createContext<AppContextValue | null>(null)

export interface AppProviderProps {
	children: ReactNode
	initialScreen?: Screen
	isFirstRun?: boolean
}

export function AppProvider({
	children,
	initialScreen = 'day',
	isFirstRun = false,
}: AppProviderProps) {
	const [state, dispatch] = useReducer(appReducer, {
		screen: isFirstRun ? 'first-run' : initialScreen,
		selectedTaskId: null,
		modalStack: [],
		isFirstRun,
		undoAction: null,
		undoSecondsLeft: 0,
	})

	const value: AppContextValue = {
		state,
		navigate: (screen) => dispatch({ type: 'NAVIGATE', screen }),
		selectTask: (taskId) => dispatch({ type: 'SELECT_TASK', taskId }),
		pushModal: (modal) => dispatch({ type: 'PUSH_MODAL', modal }),
		popModal: () => dispatch({ type: 'POP_MODAL' }),
		clearModals: () => dispatch({ type: 'CLEAR_MODALS' }),
		setFirstRun: (isFirstRun) => dispatch({ type: 'SET_FIRST_RUN', isFirstRun }),
		startUndo: (action, seconds = 5) =>
			dispatch({ type: 'START_UNDO', action, seconds }),
		tickUndo: () => dispatch({ type: 'TICK_UNDO' }),
		clearUndo: () => dispatch({ type: 'CLEAR_UNDO' }),
		setUndoReflectionSignal: (signalId) =>
			dispatch({ type: 'SET_UNDO_REFLECTION_SIGNAL', signalId }),
		activeModal: state.modalStack[state.modalStack.length - 1] ?? null,
	}

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
	const context = useContext(AppContext)
	if (!context) {
		throw new Error('useApp must be used within an AppProvider')
	}
	return context
}
