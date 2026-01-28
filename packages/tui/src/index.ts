// Main app
export { App, type AppProps } from './App.js'

// Context
export {
	DatabaseProvider,
	useDatabase,
	type DatabaseProviderProps,
} from './context/DatabaseContext.js'
export {
	AppProvider,
	useApp,
	type AppProviderProps,
	type Screen,
	type ModalType,
	type AppState,
} from './context/AppContext.js'
export {
	AvailabilityProvider,
	useAvailability,
	type AvailabilityProviderProps,
	type AvailabilityState,
} from './context/AvailabilityContext.js'

// Components
export {
	TaskCard,
	TaskListItem,
	type TaskCardProps,
	type TaskListItemProps,
} from './components/TaskCard.js'
export { StatusBar, type StatusBarProps } from './components/StatusBar.js'
export {
	ReflectionPrompt,
	type ReflectionPromptProps,
} from './components/ReflectionPrompt.js'
export { TextInput, type TextInputProps } from './components/TextInput.js'
export { HelpOverlay, type HelpOverlayProps } from './components/HelpOverlay.js'

// Screens
export { FocusScreen, type FocusScreenProps } from './screens/FocusScreen.js'
export { DayScreen, type DayScreenProps } from './screens/DayScreen.js'
export {
	CaptureScreen,
	type CaptureScreenProps,
} from './screens/CaptureScreen.js'
export {
	FirstRunScreen,
	type FirstRunScreenProps,
} from './screens/FirstRunScreen.js'

// Hooks
export {
	useTasks,
	getTaskStats,
	type UseTasksResult,
	type TaskStats,
} from './hooks/useTasks.js'
export {
	useKeymap,
	createNavigationLayer,
	type KeymapLayer,
} from './hooks/useKeymap.js'
export {
	useReflection,
	shouldShowReflection,
	getReflectionPrompt,
	type UseReflectionResult,
	type ReflectionTrigger,
	type ReflectionPrompt as ReflectionPromptType,
} from './hooks/useReflection.js'
