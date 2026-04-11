import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useConnectorOAuth } from '@/hooks/useConnectorOAuth'
import { logConnectorDisconnect } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api.client'
import { disconnectConnector, getConnectorStatus } from '@/services/connector.service'
import { useConnectorStore } from '@/store/connector.store'
import type { ConnectorConnectionStatus } from '@/types/connector.types'

interface ConnectorCardActionProps { connectorName: string; status: ConnectorConnectionStatus; userId: string }

function ConnectorCardAction({ connectorName, status, userId }: ConnectorCardActionProps) {
  const refreshConnections = useConnectorStore((state) => state.refreshConnections)
  const { connect, isConnecting, error, clearError } = useConnectorOAuth(userId)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const isConnected = status === 'connected'
  const isConnectingState = status === 'connecting' || (!isConnected && isConnecting)
  const activeError = error ?? disconnectError
  const closeDialog = () => (clearError(), setDisconnectError(null))
  const handleConnect = async () => (setDisconnectError(null), connect(connectorName))
  const handleDisconnect = async () => {
    setDisconnectError(null)
    setIsDisconnecting(true)
    try {
      await disconnectConnector(connectorName, userId)
      refreshConnections(await getConnectorStatus(userId))
      logConnectorDisconnect({ connector: connectorName, userId })
    } catch (requestError) {
      setDisconnectError(requestError instanceof ApiError ? requestError.message : requestError instanceof Error ? requestError.message : 'Connector request failed. Please try again.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const onRetry = () => void (isConnected ? handleDisconnect() : handleConnect())
  const buttonText = isConnected
    ? 'Disconnect'
    : status === 'error'
      ? 'Reconnect'
      : isConnectingState
        ? 'Connecting...'
        : 'Connect'

  const buttonTone = isConnected
    ? 'border-[#DC2626] bg-[#FFFFFF] text-[#991B1B] hover:bg-[#FEE2E2]'
    : status === 'error'
      ? 'border-[#D97706] bg-[#FFFFFF] text-[#92400E] hover:bg-[#FEF3C7]'
      : 'border-[#007AFF] bg-[#007AFF] text-[#000000] hover:bg-[#007AFF]/90'

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn('w-full transition-colors duration-200 cursor-pointer', buttonTone)}
        disabled={isConnectingState || isDisconnecting}
        onClick={onRetry}
      >
        {!isConnected && isConnectingState ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {buttonText}
      </Button>
      <Dialog open={activeError !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="border-[#AFAFAF] bg-[#FFFFFF] text-[#000000]">
          <DialogHeader>
            <DialogTitle>Connection failed</DialogTitle>
            <DialogDescription>{activeError}</DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            className="mt-1 bg-[#007AFF] text-[#000000] transition-colors duration-200 hover:bg-[#007AFF]/90"
            onClick={onRetry}
          >
            Retry
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ConnectorCardAction