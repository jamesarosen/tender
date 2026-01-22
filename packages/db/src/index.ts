export { createReadonlyClient, ReadonlyViolationError } from './readonly.js'
export {
	createDatabase,
	createKysely,
	type DatabaseConnection,
} from './database.js'

// Schema types
export type {
	ISO8601,
	UUIDv7,
	Recurrence,
	SignalKind,
	Template,
	TemplateInsert,
	Task,
	TaskInsert,
	Signal,
	SignalInsert,
	// Raw table types (for Kysely)
	TemplatesTable,
	TasksTable,
	SignalsTable,
	Database,
} from './schema.js'

// Zod schemas for validation
export {
	iso8601Schema,
	uuidv7Schema,
	tagsSchema,
	recurrenceSchema,
	signalKindSchema,
	templateSchema,
	templateInsertSchema,
	taskSchema,
	taskInsertSchema,
	signalSchema,
	signalInsertSchema,
} from './schema.js'

// Row parsing/serialization utilities
export {
	parseTemplateRow,
	parseTaskRow,
	parseSignalRow,
	serializeTemplate,
	serializeTask,
	serializeSignal,
} from './schema.js'
