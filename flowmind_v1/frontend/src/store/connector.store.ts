import { create } from 'zustand'

import type {
	ConnectorConnection,
	ConnectorHealthStatus,
} from '@/types/connector.types'

export interface ConnectorStore {
	healthStatuses: Record<string, ConnectorHealthStatus>
	connections: Record<string, ConnectorConnection>
	setHealthStatus: (connectorName: string, status: ConnectorHealthStatus) => void
	setConnection: (connection: ConnectorConnection) => void
	refreshConnections: (connections?: ConnectorConnection[]) => void
}

const toConnectionMap = (
	connections: ConnectorConnection[],
): Record<string, ConnectorConnection> => {
	const connectionMap: Record<string, ConnectorConnection> = {}
	for (const connection of connections) {
		connectionMap[connection.connector_name] = connection
	}
	return connectionMap
}

export const useConnectorStore = create<ConnectorStore>((set, get) => ({
	healthStatuses: {},
	connections: {},
	setHealthStatus: (connectorName, status) =>
		set((state) => ({
			healthStatuses: {
				...state.healthStatuses,
				[connectorName]: status,
			},
		})),
	setConnection: (connection) =>
		set((state) => ({
			connections: {
				...state.connections,
				[connection.connector_name]: connection,
			},
		})),
	refreshConnections: (connections) => {
		if (!connections) {
			set({ connections: { ...get().connections } })
			return
		}

		set({ connections: toConnectionMap(connections) })
	},
}))
