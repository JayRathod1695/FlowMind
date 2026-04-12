import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { CheckCircle2, XCircle, Link2, Link2Off } from "lucide-react";

export type ConnectionStatus = "connected" | "disconnected" | "error";

export interface ConnectorCardProps {
  name: string;
  icon: React.ReactNode;
  status: ConnectionStatus;
  accountLabel?: string;
  errorMessage?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ConnectorCard({
  name,
  icon,
  status,
  accountLabel,
  errorMessage,
  onConnect,
  onDisconnect,
}: ConnectorCardProps) {
  const isConnected = status === "connected";
  const isError = status === "error";

  return (
    <Card className="p-0 border-2 border-border shadow-xs hover:shadow-sm transition-all group">
      <div className="p-6 flex flex-col justify-between h-[200px]">
        {/* Top Row */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-muted border-2 border-border flex items-center justify-center group-hover:scale-105 transition-transform">
            {icon}
          </div>

          <div className="flex items-center gap-1.5 font-semibold text-xs">
            {isConnected && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-chart-4" />
                <span className="text-chart-4">Connected</span>
              </>
            )}
            {isError && (
              <>
                <XCircle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-destructive">Error</span>
              </>
            )}
            {status === "disconnected" && (
              <>
                <div className="w-2 h-2 bg-muted-foreground/30" />
                <span className="text-muted-foreground">Not connected</span>
              </>
            )}
          </div>
        </div>

        {/* Name & Account */}
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-lg">{name}</h3>
          {isConnected ? (
            <span className="text-sm font-mono text-muted-foreground truncate pr-2">{accountLabel}</span>
          ) : isError ? (
            <span className="text-sm text-destructive font-medium">{errorMessage}</span>
          ) : (
            <span className="text-sm text-transparent h-5">&nbsp;</span>
          )}
        </div>

        {/* Action */}
        <div className="w-full">
          {isConnected ? (
            <Button
              variant="outline"
              className="w-full border-2 border-border shadow-2xs"
              onClick={onDisconnect}
            >
              <Link2Off className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : isError ? (
            <Button
              variant="outline"
              className="w-full border-2 border-destructive/30 text-destructive shadow-2xs"
              onClick={onConnect}
            >
              Reconnect
            </Button>
          ) : (
            <Button
              className="w-full border-2 border-border shadow-sm"
              onClick={onConnect}
            >
              <Link2 className="w-4 h-4 mr-2" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
