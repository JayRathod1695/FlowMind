import { ExecutionPanel } from "../components/execution/ExecutionPanel";
import { LogViewer } from "../components/logs/LogViewer";
import { Button } from "../components/ui/button";
import { RefreshCw, Download } from "lucide-react";

export default function ExecutionPage() {
  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-border pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Active Execution</h2>
          <p className="text-muted-foreground text-sm mt-1">Monitoring live execution steps and system logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-2 border-border shadow-2xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button variant="outline" className="border-2 border-border shadow-2xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Logs
          </Button>
        </div>
      </div>

      <ExecutionPanel />
      <LogViewer />
    </div>
  );
}
