import { memo } from 'react'

import ConnectorCardAction from '@/components/connectors/ConnectorCard.sub'
import { cn } from '@/lib/utils'
import type {
  AvailableConnector,
  ConnectorConnection,
  ConnectorConnectionStatus,
} from '@/types/connector.types'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface ConnectorCardProps {
  connector: AvailableConnector
  connection: ConnectorConnection | undefined
  userId: string
}

interface ConnectionVisualState {
  status: ConnectorConnectionStatus
  dotClass: string
  cardClass: string
  label: string
  labelClass?: string
}

const toVisualState = (connection: ConnectorConnection | undefined): ConnectionVisualState => {
  if (!connection || connection.status === 'disconnected') {
    return {
      status: 'disconnected',
      dotClass: 'bg-[#AFAFAF]',
      cardClass: 'border-[#AFAFAF] bg-[#FFFFFF]',
      label: 'Not connected',
    }
  }

  if (connection.status === 'connecting') {
    return {
      status: 'connecting',
      dotClass: 'bg-[#AFAFAF]',
      cardClass: 'border-[#AFAFAF] bg-[#F3F3F3]',
      label: 'Connecting...',
    }
  }

  if (connection.status === 'error') {
    return {
      status: 'error',
      dotClass: 'bg-[#DC2626]',
      cardClass: 'border-[#FCA5A5] bg-[#FEF2F2]',
      label: connection.error_message ?? 'Connection failed.',
      labelClass: 'text-[#991B1B]',
    }
  }

  return {
    status: 'connected',
    dotClass: 'bg-[#16A34A]',
    cardClass: 'border-[#86EFAC] bg-[#F0FDF4]',
    label: connection.connected_account_label ?? 'Connected',
  }
}

function ConnectorCardComponent({ connector, connection, userId }: ConnectorCardProps) {
  const visualState = toVisualState(connection)

  return (
    <Card className={cn('h-full shadow-[0_4px_6px_rgba(0,0,0,0.1)] transition-colors duration-200', visualState.cardClass)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-[#000000]">{connector.display_name}</CardTitle>
        <p className="text-xs text-[#1F1F1F]">{connector.name}</p>
      </CardHeader>

      <CardContent>
        <div className="flex min-h-5 items-center gap-2 text-sm">
          <span className={cn('h-2.5 w-2.5 rounded-full', visualState.dotClass)} aria-hidden="true" />
          <span className={cn('text-[#1F1F1F]', visualState.labelClass)}>{visualState.label}</span>
        </div>
      </CardContent>

      <CardFooter>
        <ConnectorCardAction connectorName={connector.name} status={visualState.status} userId={userId} />
      </CardFooter>
    </Card>
  )
}

const ConnectorCard = memo(ConnectorCardComponent)
ConnectorCard.displayName = 'ConnectorCard'

export default ConnectorCard