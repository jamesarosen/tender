import { createContext, useContext, useReducer, type ReactNode } from 'react'

export type Screen = 'focus' | 'day' | 'capture' | 'first-run'
export type ModalType = 'help' | 'reflection'

export interface AppState {
	screen: Screen
	selectedTaskId: string | null
	modalStack: ModalType[]
	isFirstRun: boolean
}

type AppAction =
	| { type: 'NAVIGATE'; screen: Screen }
	| { type: 'SELECT_TASK'; taskId: string | null }
	| { type: 'PUSH_MODAL'; modal: ModalType }
	| { type: 'POP_MODAL' }
	| { type: 'CLEAR_MODALS' }
	| { type: 'SET_FIRST_RUN'; isFirstRun: boolean }

function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case 'NAVIGATE':
			return { ...state, screen: action.screen, modalStack: [] }
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
	})

	const value: AppContextValue = {
		state,
		navigate: (screen) => dispatch({ type: 'NAVIGATE', screen }),
		selectTask: (taskId) => dispatch({ type: 'SELECT_TASK', taskId }),
		pushModal: (modal) => dispatch({ type: 'PUSH_MODAL', modal }),
		popModal: () => dispatch({ type: 'POP_MODAL' }),
		clearModals: () => dispatch({ type: 'CLEAR_MODALS' }),
		setFirstRun: (isFirstRun) => dispatch({ type: 'SET_FIRST_RUN', isFirstRun }),
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
