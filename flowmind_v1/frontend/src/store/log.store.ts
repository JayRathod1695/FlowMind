import { create } from 'zustand'

import type { LogEntry, LogFilter } from '@/types/log.types'

export interface LogStore {
	entries: LogEntry[]
	filters: LogFilter
	addEntry: (entry: LogEntry) => void
	setFilter: (filterUpdate: Partial<LogFilter>) => void
	clearEntries: () => void
}

const defaultFilters: LogFilter = {
	level: 'ALL',
	subsystem: 'ALL',
}

export const useLogStore = create<LogStore>((set) => ({
	entries: [],
	filters: defaultFilters,
	addEntry: (entry) =>
		set((state) => ({
			entries: [...state.entries, entry],
		})),
	setFilter: (filterUpdate) =>
		set((state) => ({
			filters: {
				...state.filters,
				...filterUpdate,
			},
		})),
	clearEntries: () => set({ entries: [] }),
}))
