// Availability state machine
export {
	AvailabilityManager,
	createAvailabilityManager,
} from './availability.js'

// Availability checker (for API validation)
export {
	checkAnthropicAvailability,
	parseRetryAfter,
	classifyResponse,
	isAvailabilityError,
	availabilityErrorCodeSchema,
	AvailabilityErrorCodes,
	type AvailabilityError,
	type AvailabilityErrorCode,
	type CheckerOptions,
} from './availability-checker.js'

// XState availability machine
export {
	llmAvailabilityMachine,
	llmAvailabilityStateSchema,
	LlmAvailabilityStates,
	type LlmAvailabilityContext,
	type LlmAvailabilityEvent,
	type LlmAvailabilityInput,
	type LlmAvailabilityStateValue,
} from './llm-availability-machine.js'

// Prioritization strategies
export {
	dueDateAgeStrategy,
	ageOnlyStrategy,
	dueDateOnlyStrategy,
	strategies,
	getStrategy,
	defaultStrategy,
} from './prioritization.js'

// Degraded mode responses
export {
	degradedResponses,
	degradedResponseTemplates,
	getDegradedResponse,
	formatResponse,
	type DegradedResponseKey,
	type DegradedTemplateKey,
} from './degraded-responses.js'

// Types
export {
	availabilityStatusSchema,
	AvailabilityStatuses,
	unavailableReasonSchema,
	UnavailableReasons,
	type AvailabilityState,
	type AvailabilityStatus,
	type AvailabilityListener,
	type AvailabilityChecker,
	type AvailabilityConfig,
	type UnavailableReason,
	type Unsubscribe,
	type PrioritizationStrategy,
	type PrioritizationContext,
} from './types.js'
