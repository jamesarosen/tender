import { createContext, useContext, type ReactNode } from 'react'
import { useMachine } from '@xstate/react'
import {
	llmAvailabilityMachine,
	type LlmAvailabilityInput,
	type LlmAvailabilityStateValue,
	type LlmAvailabilityContext as MachineContext,
} from '@tender/agent'

export interface AvailabilityState {
	status: LlmAvailabilityStateValue
	context: MachineContext
	check: () => void
}

const AvailabilityContext = createContext<AvailabilityState | null>(null)

export interface AvailabilityProviderProps {
	children: ReactNode
	input: LlmAvailabilityInput
}

export function AvailabilityProvider({
	children,
	input,
}: AvailabilityProviderProps) {
	const [state, send] = useMachine(llmAvailabilityMachine, { input })

	const value: AvailabilityState = {
		status: state.value as LlmAvailabilityStateValue,
		context: state.context,
		check: () => send({ type: 'CHECK' }),
	}

	return (
		<AvailabilityContext.Provider value={value}>
			{children}
		</AvailabilityContext.Provider>
	)
}

export function useAvailability(): AvailabilityState {
	const context = useContext(AvailabilityContext)
	if (!context) {
		throw new Error('useAvailability must be used within an AvailabilityProvider')
	}
	return context
}
