import { Card } from "../ui/card";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";

const MOCK_STEPS = [
  { id: 1, name: "Receive User Request", status: "completed", duration: "12ms" },
  { id: 2, name: "Fetch Jira Issues", status: "completed", duration: "145ms" },
  { id: 3, name: "Fetch PRs", status: "completed", duration: "890ms" },
  { id: 4, name: "Analyze Differences", status: "running", duration: "4.2s" },
  { id: 5, name: "Update Jira Tickets", status: "pending", requiresApproval: true },
  { id: 6, name: "Send Slack Summary", status: "pending" },
];

export function ExecutionPanel() {
  return (
    <div className="flex flex-col gap-4 w-full">
      <Card className="p-0 border-2 border-border shadow-xs">
        <div className="p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">Execution Steps</h3>

          <div className="flex flex-col gap-0 border-2 border-border overflow-hidden bg-muted/20">
            {MOCK_STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={`flex flex-col gap-3 p-4 ${idx !== MOCK_STEPS.length - 1 ? "border-b-2 border-border" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-card border-2 border-border flex items-center justify-center shrink-0">
                      {step.status === "completed" && <CheckCircle2 className="w-5 h-5 text-chart-4" />}
                      {step.status === "running" && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                      {step.status === "pending" && <div className="w-2 h-2 bg-muted-foreground/30" />}
                    </div>

                    <span
                      className={`font-semibold text-sm ${step.status === "pending" ? "text-muted-foreground" : ""}`}
                    >
                      {step.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    {step.duration && (
                      <span className="bg-muted px-2 py-1 border border-border text-xs">{step.duration}</span>
                    )}
                  </div>
                </div>

                {step.status === "running" && (
                  <div className="ml-14 pl-4 border-l-2 border-primary text-sm text-muted-foreground">
                    <span className="animate-pulse">LLM is processing context to generate diff analysis...</span>
                  </div>
                )}

                {step.requiresApproval && step.status === "pending" && (
                  <div className="ml-14 mt-2 p-4 border-2 border-accent bg-accent/10">
                    <div className="flex items-center gap-2 text-accent-foreground font-bold mb-1 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Approval Required
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      This step will mutate data in Jira. Do you want to proceed?
                    </p>
                    <div className="flex gap-2">
                      <Button className="border-2 border-border shadow-xs h-8 text-xs font-bold">
                        Approve
                      </Button>
                      <Button variant="outline" className="h-8 text-xs border-2 border-border shadow-2xs">
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
