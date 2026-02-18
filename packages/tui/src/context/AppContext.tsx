import { createContext, useContext, useReducer, type ReactNode } from 'react'

export type Screen = 'focus' | 'day' | 'capture' | 'first-run'
export type ModalType = 'help' | 'reflection'

export type UndoAction =
	| {
			kind: 'complete' | 'delete'
			taskId: string
			signalId: string
			reflectionSignalId: string | null
	  }
	| {
			kind: 'reword'
			taskId: string
			previousDescription: string
	  }

export interface AppState {
	screen: Screen
	selectedTaskId: string | null
	modalStack: ModalType[]
	isFirstRun: boolean
	undoAction: UndoAction | null
	undoSecondsLeft: number
	editingTaskId: string | null
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
	| { type: 'START_EDITING'; taskId: string }
	| { type: 'STOP_EDITING' }

function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case 'NAVIGATE':
			return {
				...state,
				screen: action.screen,
				modalStack: [],
				undoAction: null,
				undoSecondsLeft: 0,
				editingTaskId: null,
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
			if (!state.undoAction || state.undoAction.kind === 'reword') return state
			return {
				...state,
				undoAction: {
					...state.undoAction,
					reflectionSignalId: action.signalId,
				},
			}
		case 'START_EDITING':
			return { ...state, editingTaskId: action.taskId }
		case 'STOP_EDITING':
			return { ...state, editingTaskId: null }
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
	startEditing: (taskId: string) => void
	stopEditing: () => void
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
		editingTaskId: null,
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
		startEditing: (taskId) => dispatch({ type: 'START_EDITING', taskId }),
		stopEditing: () => dispatch({ type: 'STOP_EDITING' }),
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
