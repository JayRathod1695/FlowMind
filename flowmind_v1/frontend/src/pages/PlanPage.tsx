import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";

import { Button } from "../components/ui/button";
import {
  getPlan,
  executePlan,
  createExecutionStream,
  type AgentPlan,
  type PlanStep,
  type ExecutionStep,
  type SSEEvent,
} from "@/lib/api";

type StepStatus = "pending" | "running" | "completed" | "error";

interface LiveStep extends PlanStep {
  status: StepStatus;
  result?: string;
  error?: string;
}

export default function PlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionDone, setExecutionDone] = useState(false);
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([]);
  const [streamingTokens, setStreamingTokens] = useState("");
  const [finalSummary, setFinalSummary] = useState("");
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionStep[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);

  // Load plan
  useEffect(() => {
    if (!planId) return;
    let isMounted = true;
    const load = async () => {
      try {
        const data = await getPlan(planId);
        if (isMounted) {
          setPlan(data);
          setLiveSteps(data.steps.map((s) => ({ ...s, status: "pending" as StepStatus })));
        }
      } catch (err) {
        if (isMounted) setLoadError(err instanceof Error ? err.message : "Failed to load plan");
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [planId]);

  // Elapsed timer
  useEffect(() => {
    if (!isExecuting) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [isExecuting]);

  // Auto-scroll summary
  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.scrollTop = summaryRef.current.scrollHeight;
    }
  }, [streamingTokens]);

  const handleExecute = useCallback(async () => {
    if (!planId || isExecuting) return;
    setIsExecuting(true);
    setExecutionError(null);
    setStreamingTokens("");
    setFinalSummary("");

    // Start SSE stream first
    const eventSource = createExecutionStream(planId);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;

        switch (data.type) {
          case "step_start":
            setLiveSteps((prev) =>
              prev.map((s) =>
                s.step === data.step ? { ...s, status: "running" } : s
              )
            );
            break;

          case "step_complete":
            setLiveSteps((prev) =>
              prev.map((s) =>
                s.step === data.step ? { ...s, status: "completed", result: data.result } : s
              )
            );
            break;

          case "step_error":
            setLiveSteps((prev) =>
              prev.map((s) =>
                s.step === data.step ? { ...s, status: "error", error: data.error } : s
              )
            );
            break;

          case "llm_token":
            setStreamingTokens((prev) => prev + data.token);
            break;

          case "execution_complete":
            setFinalSummary(data.summary);
            setExecutionDone(true);
            setIsExecuting(false);
            eventSource.close();
            break;

          case "execution_error":
            setExecutionError(data.error);
            setExecutionDone(true);
            setIsExecuting(false);
            eventSource.close();
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    // Now trigger execution
    try {
      const result = await executePlan(planId);
      setExecutionResult(result.steps);
      if (!finalSummary && result.assistant_response) {
        setFinalSummary(result.assistant_response);
      }
      setExecutionDone(true);
    } catch (err) {
      setExecutionError(err instanceof Error ? err.message : "Execution failed");
      setExecutionDone(true);
    } finally {
      setIsExecuting(false);
    }
  }, [planId, isExecuting, finalSummary]);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="border-2 border-destructive/30 bg-destructive/5 p-6 max-w-md text-center">
          <XCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-destructive font-medium">{loadError}</p>
          <Button className="mt-4" onClick={() => navigate("/app")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-border pb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="border-2 border-border" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Execution Plan</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg truncate">{plan.prompt}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isExecuting && (
            <span className="text-xs font-mono text-muted-foreground border-2 border-border px-3 py-1.5">
              ⏱ {elapsedSeconds}s
            </span>
          )}
          <span className="text-xs font-mono text-muted-foreground border-2 border-border px-3 py-1.5">
            ID: {plan.plan_id}
          </span>
          {!executionDone && (
            <Button
              className="border-2 border-border shadow-sm"
              onClick={() => void handleExecute()}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Plan
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Plan Summary */}
      <div className="border-2 border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-primary/10 border-2 border-border flex items-center justify-center text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm">Plan Summary</h3>
          <span className="text-xs text-muted-foreground border-2 border-border px-2 py-0.5">
            {plan.step_count} step{plan.step_count !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-sm text-muted-foreground ml-11">{plan.plan_summary}</p>
      </div>

      {/* DAG Visualization */}
      <div className="border-2 border-border bg-card p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Execution DAG</h3>
        <div className="flex flex-col items-center gap-1">
          {liveSteps.map((step, idx) => (
            <div key={step.step} className="w-full max-w-2xl">
              {/* Step Node */}
              <div className={`border-2 p-4 transition-all ${
                step.status === "running"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : step.status === "completed"
                    ? "border-chart-4/60 bg-chart-4/5"
                    : step.status === "error"
                      ? "border-destructive/60 bg-destructive/5"
                      : "border-border bg-card hover:bg-muted/30"
              }`}>
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className="shrink-0">
                    {step.status === "running" ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : step.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-chart-4" />
                    ) : step.status === "error" ? (
                      <XCircle className="w-5 h-5 text-destructive" />
                    ) : (
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Step info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{step.server_icon}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Step {step.step}
                      </span>
                      <span className="text-xs text-muted-foreground">[{step.server}]</span>
                      <span className="text-xs font-mono text-primary font-semibold">{step.tool}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{step.description}</p>
                  </div>

                  {/* Status badge */}
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border shrink-0 ${
                    step.status === "running"
                      ? "border-primary/30 text-primary bg-primary/10"
                      : step.status === "completed"
                        ? "border-chart-4/30 text-chart-4 bg-chart-4/10"
                        : step.status === "error"
                          ? "border-destructive/30 text-destructive bg-destructive/10"
                          : "border-border text-muted-foreground"
                  }`}>
                    {step.status}
                  </span>
                </div>

                {/* Result/Error (shown when done) */}
                {step.status === "completed" && step.result && (
                  <div className="mt-3 ml-8">
                    <pre className="text-xs bg-background border border-border p-2.5 overflow-auto max-h-24 whitespace-pre-wrap break-words select-text text-muted-foreground">
                      {step.result}
                    </pre>
                  </div>
                )}
                {step.status === "error" && step.error && (
                  <div className="mt-3 ml-8">
                    <pre className="text-xs bg-destructive/5 border border-destructive/20 p-2.5 overflow-auto max-h-24 whitespace-pre-wrap break-words select-text text-destructive">
                      {step.error}
                    </pre>
                  </div>
                )}

                {/* Using execution result data if available */}
                {step.status === "pending" && executionResult.length > 0 && (() => {
                  const execStep = executionResult.find((e) => e.step === step.step);
                  if (!execStep) return null;
                  return (
                    <div className="mt-3 ml-8">
                      <pre className="text-xs bg-background border border-border p-2.5 overflow-auto max-h-24 whitespace-pre-wrap break-words select-text text-muted-foreground">
                        {execStep.result}
                      </pre>
                    </div>
                  );
                })()}
              </div>

              {/* Arrow between steps */}
              {idx < liveSteps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className={`w-4 h-4 ${
                    step.status === "completed" ? "text-chart-4" : "text-border"
                  }`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Streaming Summary / Final Response */}
      {(streamingTokens || finalSummary) && (
        <div className="border-2 border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-chart-4/10 border-2 border-border flex items-center justify-center text-chart-4">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">
              {executionDone ? "Agent Response" : "Streaming Response..."}
            </h3>
            {!executionDone && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          </div>
          <div
            ref={summaryRef}
            className="bg-background border border-border p-4 max-h-60 overflow-auto"
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {finalSummary || streamingTokens}
              {!executionDone && <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />}
            </div>
          </div>
        </div>
      )}

      {/* Execution Error */}
      {executionError && (
        <div className="border-2 border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Execution Failed</p>
            <p className="text-xs text-destructive/80 mt-1">{executionError}</p>
          </div>
        </div>
      )}

      {/* Done actions */}
      {executionDone && (
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-2 border-border" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      )}
    </div>
  );
}
