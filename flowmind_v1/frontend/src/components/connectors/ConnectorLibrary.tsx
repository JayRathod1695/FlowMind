import { useCallback, useEffect, useState } from 'react'

import ConnectorCard from '@/components/connectors/ConnectorCard'
import { Button } from '@/components/ui/button'
import { useConnectorStatus } from '@/hooks/useConnectorStatus'
import { ApiError } from '@/services/api.client'
import { getAvailableConnectors } from '@/services/connector.service'
import { useConnectorStore } from '@/store/connector.store'
import type { AvailableConnector } from '@/types/connector.types'

const normalizeConnectorName = (connectorName: string): string => {
  const normalized = connectorName.trim().toLowerCase()
  return normalized === 'google' ? 'sheets' : normalized
}

const toErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Unable to load connector library right now.'
}

function ConnectorLibrary() {
  const [userId] = useState('default-user')
  const connections = useConnectorStore((state) => state.connections)
  const { isLoading: isStatusLoading, error: statusError, refresh } = useConnectorStatus(userId)

  const [connectors, setConnectors] = useState<AvailableConnector[]>([])
  const [isLibraryLoading, setIsLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  const loadConnectors = useCallback(async () => {
    setIsLibraryLoading(true)
    try {
      setConnectors(await getAvailableConnectors())
      setLibraryError(null)
    } catch (requestError) {
      setLibraryError(toErrorMessage(requestError))
      setConnectors([])
    } finally {
      setIsLibraryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConnectors()
  }, [loadConnectors])

  const activeError = libraryError ?? statusError

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-[#AFAFAF] bg-[#E5E5E5] px-3 py-1 font-medium text-[#1F1F1F]">
          {isLibraryLoading ? 'Loading connectors...' : 'Connector library loaded'}
        </span>
        <span className="rounded-full border border-[#AFAFAF] bg-[#E5E5E5] px-3 py-1 font-medium text-[#1F1F1F]">
          {isStatusLoading ? 'Syncing connection status...' : 'Connection polling active'}
        </span>
        {activeError ? <span className="rounded-full border border-[#DC2626] bg-[#FEE2E2] px-3 py-1 font-medium text-[#991B1B]">{activeError}</span> : null}
        {activeError ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[#AFAFAF] bg-[#FFFFFF] text-[#000000] transition-colors duration-200 hover:border-[#007AFF] hover:bg-[#E5E5E5]"
            onClick={() => void Promise.all([loadConnectors(), refresh()])}
          >
            Retry
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {connectors.map((connector) => (
          <ConnectorCard
            key={connector.name}
            connector={connector}
            connection={connections[normalizeConnectorName(connector.name)]}
            userId={userId}
          />
        ))}
      </div>

      {!isLibraryLoading && connectors.length === 0 ? (
        <p className="rounded-xl border border-[#AFAFAF] bg-[#E5E5E5] px-4 py-6 text-sm text-[#1F1F1F]">
          No connectors are available right now.
        </p>
      ) : null}
    </section>
  )
}

export default ConnectorLibrary