export type ConnectorHealthStatus = 'healthy' | 'degraded' | 'down'

export type ConnectorConnectionStatus =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'error'

export interface ConnectorConnection {
	connector_name: string
	status: ConnectorConnectionStatus
	connected_account_label: string | null
	connected_at: string | null
	last_used_at: string | null
	error_message: string | null
}

export interface AvailableConnector {
	name: string
	display_name: string
}
