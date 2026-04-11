import { apiRequest } from '@/services/api.client'
import type {
	AvailableConnector,
	ConnectorConnection,
} from '@/types/connector.types'

export interface InitiateConnectResponse {
	connector_name: string
	user_id: string
	auth_url: string
}

export interface DisconnectConnectorResponse {
	connector_name: string
	user_id: string
	success: boolean
}

const normalizeConnectorName = (connectorName: string): string => {
	const normalized = connectorName.trim().toLowerCase()
	return normalized === 'google' ? 'sheets' : normalized
}

const withUserIdQuery = (path: string, userId: string): string =>
	`${path}?user_id=${encodeURIComponent(userId)}`

export const getAvailableConnectors = async (): Promise<AvailableConnector[]> => {
	const payload = await apiRequest<{ connectors: AvailableConnector[] }>(
		'/connectors/available',
	)
	return payload.connectors
}

export const getConnectorStatus = async (
	userId: string,
): Promise<ConnectorConnection[]> => {
	const payload = await apiRequest<{ connectors: ConnectorConnection[] }>(
		withUserIdQuery('/connectors/status', userId),
	)
	return payload.connectors
}

export const initiateConnect = async (
	connectorName: string,
	userId: string,
): Promise<InitiateConnectResponse> =>
	apiRequest<InitiateConnectResponse>(
		`/connectors/${normalizeConnectorName(connectorName)}/connect`,
		{
			method: 'POST',
			body: JSON.stringify({ user_id: userId }),
		},
	)

export const disconnectConnector = async (
	connectorName: string,
	userId: string,
): Promise<DisconnectConnectorResponse> =>
	apiRequest<DisconnectConnectorResponse>(
		`/connectors/${normalizeConnectorName(connectorName)}/disconnect`,
		{
			method: 'POST',
			body: JSON.stringify({ user_id: userId }),
		},
	)
