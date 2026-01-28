import { describe, it, expect } from 'vitest'
import React, { useState, useEffect } from 'react'
import { render } from 'ink-testing-library'
import { Text } from 'ink'
import { AppProvider, useApp } from './AppContext.js'

function TestComponent() {
	const { state, activeModal } = useApp()
	return (
		<Text>
			screen:{state.screen} task:{state.selectedTaskId ?? 'none'} modal:
			{activeModal ?? 'none'}
		</Text>
	)
}

describe('AppContext', () => {
	it('provides initial screen state', () => {
		const { lastFrame } = render(
			<AppProvider initialScreen="focus">
				<TestComponent />
			</AppProvider>
		)
		expect(lastFrame()).toContain('screen:focus')
	})

	it('uses first-run screen when isFirstRun is true', () => {
		const { lastFrame } = render(
			<AppProvider isFirstRun={true}>
				<TestComponent />
			</AppProvider>
		)
		expect(lastFrame()).toContain('screen:first-run')
	})

	it('provides navigation functions', async () => {
		function NavigatingComponent() {
			const { state, navigate } = useApp()
			const [mounted, setMounted] = useState(false)

			useEffect(() => {
				if (!mounted) {
					setMounted(true)
					navigate('day')
				}
			}, [mounted, navigate])

			return <Text>screen:{state.screen}</Text>
		}

		const { frames } = render(
			<AppProvider>
				<NavigatingComponent />
			</AppProvider>
		)

		// Wait for all renders to complete
		await new Promise((r) => setTimeout(r, 50))
		expect(frames.at(-1)).toContain('screen:day')
	})

	it('provides task selection', async () => {
		function SelectingComponent() {
			const { state, selectTask } = useApp()
			const [mounted, setMounted] = useState(false)

			useEffect(() => {
				if (!mounted) {
					setMounted(true)
					selectTask('task-123')
				}
			}, [mounted, selectTask])

			return <Text>task:{state.selectedTaskId ?? 'none'}</Text>
		}

		const { frames } = render(
			<AppProvider>
				<SelectingComponent />
			</AppProvider>
		)

		await new Promise((r) => setTimeout(r, 50))
		expect(frames.at(-1)).toContain('task:task-123')
	})

	it('manages modal stack', async () => {
		function ModalComponent() {
			const { activeModal, pushModal } = useApp()
			const [mounted, setMounted] = useState(false)

			useEffect(() => {
				if (!mounted) {
					setMounted(true)
					pushModal('help')
				}
			}, [mounted, pushModal])

			return <Text>modal:{activeModal ?? 'none'}</Text>
		}

		const { frames } = render(
			<AppProvider>
				<ModalComponent />
			</AppProvider>
		)

		await new Promise((r) => setTimeout(r, 50))
		expect(frames.at(-1)).toContain('modal:help')
	})
})
