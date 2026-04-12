import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

export type CustomNodeData = {
  label: string;
  confidence?: number;
  status?: 'pending' | 'running' | 'completed' | 'error';
  service?: string;
};

export function DAGNode({ data }: NodeProps) {
  const customData = data as CustomNodeData;
  const isRunning = customData.status === 'running';
  const isCompleted = customData.status === 'completed';

  return (
    <Card className={`relative min-w-[200px] p-0 border-2 transition-all ${
      isRunning ? 'border-primary shadow-md' :
      isCompleted ? 'border-chart-4 shadow-xs' : 'border-border shadow-2xs'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-background border-2 border-border" />

      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold tracking-wider text-muted-foreground uppercase">
            {customData.service || 'System'}
          </span>
          {isRunning && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-chart-4" />}
        </div>

        <div className="font-bold text-sm leading-tight">
          {customData.label}
        </div>

        {customData.confidence !== undefined && (
          <div className="mt-2 flex justify-end">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-2 ${
              customData.confidence > 80 ? 'bg-chart-4/10 text-chart-4 border-chart-4/30' : 'bg-muted text-muted-foreground border-border'
            }`}>
              {customData.confidence}% Confidence
            </Badge>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-background border-2 border-border" />
    </Card>
  );
}
