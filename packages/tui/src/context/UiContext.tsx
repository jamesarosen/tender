import { createContext, useContext } from 'react'

export interface UiSettings {
	unicode: boolean
}

const UiContext = createContext<UiSettings | null>(null)

export interface UiProviderProps {
	unicode: boolean
	children: React.ReactNode
}

export function UiProvider({ unicode, children }: UiProviderProps) {
	return <UiContext.Provider value={{ unicode }}>{children}</UiContext.Provider>
}

export function useUi(): UiSettings {
	const ui = useContext(UiContext)
	if (!ui) {
		throw new Error('useUi must be used within a UiProvider')
	}
	return ui
}
