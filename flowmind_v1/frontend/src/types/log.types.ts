export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogEntry {
	id: string
	trace_id: string | null
	timestamp: string
	level: LogLevel
	subsystem: string
	action: string
	data: Record<string, unknown> | null
	duration_ms: number | null
	execution_id: string | null
}

export interface LogFilter {
	level: LogLevel | 'ALL'
	subsystem: string | 'ALL'
}
