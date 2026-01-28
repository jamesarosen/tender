import { createContext, useContext } from 'react'
import type { Kysely } from 'kysely'
import type { Database } from '@tender/db'

const DatabaseContext = createContext<Kysely<Database> | null>(null)

export interface DatabaseProviderProps {
	db: Kysely<Database>
	children: React.ReactNode
}

export function DatabaseProvider({ db, children }: DatabaseProviderProps) {
	return (
		<DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
	)
}

export function useDatabase(): Kysely<Database> {
	const db = useContext(DatabaseContext)
	if (!db) {
		throw new Error('useDatabase must be used within a DatabaseProvider')
	}
	return db
}
