import { DAGCanvas } from "../components/dag/DAGCanvas";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Play, Pencil, Download } from "lucide-react";

export default function DAGPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 border-b-2 border-border pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Workflow Planner</h2>
          <p className="text-muted-foreground text-sm mt-1">Review the generated DAG before execution.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-2 border-border shadow-2xs">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button variant="outline" className="border-2 border-border shadow-2xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
          <Button
            className="border-2 border-border shadow-sm"
            onClick={() => navigate('/app/execution')}
          >
            <Play className="w-4 h-4 mr-1.5" />
            Execute
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 w-full relative min-h-0 border-2 border-border bg-card shadow-xs overflow-hidden">
        <DAGCanvas />
      </div>
    </div>
  );
}
