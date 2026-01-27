import {
	AvailabilityStatuses,
	UnavailableReasons,
	type AvailabilityState,
	type AvailabilityListener,
	type AvailabilityChecker,
	type AvailabilityConfig,
	type Unsubscribe,
} from './types.js'

/**
 * Manages LLM availability state with automatic retry and reconnection.
 *
 * The manager tracks whether the LLM is available and handles:
 * - Initial availability check on startup
 * - Retry logic when API calls fail
 * - Periodic reconnection attempts when unavailable
 * - Permanent unavailable state when no API key is configured
 */
export class AvailabilityManager {
	private state: AvailabilityState = { status: AvailabilityStatuses.unknown }
	private listeners = new Set<AvailabilityListener>()
	private retryTimer: ReturnType<typeof setTimeout> | null = null
	private failureCount = 0

	constructor(
		private readonly config: AvailabilityConfig,
		private readonly checker: AvailabilityChecker
	) {}

	/**
	 * Returns the current availability state.
	 */
	getState(): AvailabilityState {
		return this.state
	}

	/**
	 * Checks if the LLM is currently available.
	 * Convenience method for state.status === 'available'.
	 */
	isAvailable(): boolean {
		return this.state.status === AvailabilityStatuses.available
	}

	/**
	 * Subscribes to state changes.
	 * Returns an unsubscribe function.
	 */
	subscribe(listener: AvailabilityListener): Unsubscribe {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	/**
	 * Performs an availability check.
	 *
	 * If no API key is configured, immediately transitions to unavailable.
	 * Otherwise, calls the checker function and transitions based on result.
	 */
	async check(): Promise<AvailabilityState> {
		// No API key = permanently unavailable
		if (!this.config.apiKey) {
			this.setState({
				status: AvailabilityStatuses.unavailable,
				reason: UnavailableReasons['no-api-key'],
				since: new Date(),
			})
			// Don't schedule retry for missing API key
			return this.state
		}

		this.setState({ status: AvailabilityStatuses.checking })

		try {
			await this.checker()
			this.failureCount = 0
			this.setState({ status: AvailabilityStatuses.available })
			this.cancelRetry()
		} catch {
			this.failureCount++

			if (this.failureCount >= this.config.retryCount) {
				this.setState({
					status: AvailabilityStatuses.unavailable,
					reason: UnavailableReasons['api-error'],
					since: new Date(),
				})
				this.scheduleRetry()
			} else {
				// Retry immediately (up to retryCount times)
				return this.check()
			}
		}

		return this.state
	}

	/**
	 * Schedules a retry check after the configured interval.
	 * Only schedules if not already scheduled and reason is api-error.
	 */
	scheduleRetry(): void {
		if (this.retryTimer) return

		// Don't retry if no API key
		if (
			this.state.status === AvailabilityStatuses.unavailable &&
			this.state.reason === UnavailableReasons['no-api-key']
		) {
			return
		}

		this.retryTimer = setTimeout(() => {
			this.retryTimer = null
			this.failureCount = 0 // Reset for fresh retry cycle
			this.check()
		}, this.config.reconnectIntervalMs)
	}

	/**
	 * Cancels any scheduled retry.
	 */
	cancelRetry(): void {
		if (this.retryTimer) {
			clearTimeout(this.retryTimer)
			this.retryTimer = null
		}
	}

	/**
	 * Cleans up resources (timers, listeners).
	 */
	dispose(): void {
		this.cancelRetry()
		this.listeners.clear()
	}

	/**
	 * Updates state and notifies listeners.
	 */
	private setState(newState: AvailabilityState): void {
		this.state = newState
		for (const listener of this.listeners) {
			listener(newState)
		}
	}
}

/**
 * Creates an AvailabilityManager with the given configuration.
 *
 * @param config - Configuration for retry and reconnect behavior
 * @param checker - Function that checks if the LLM is reachable
 */
export function createAvailabilityManager(
	config: AvailabilityConfig,
	checker: AvailabilityChecker
): AvailabilityManager {
	return new AvailabilityManager(config, checker)
}
