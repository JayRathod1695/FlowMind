import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock3, Loader2, RefreshCw, Sparkles, Webhook } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getHooksSummary, type HookStatus, type HookTask, type HooksSummary } from "@/lib/api";

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatJson(value: Record<string, unknown> | null): string {
  return value ? JSON.stringify(value, null, 2) : "";
}

function statusTone(status: HookStatus): string {
  switch (status) {
    case "waiting":
      return "text-amber-700 bg-amber-500/10 border-amber-500/30";
    case "resumed":
      return "text-primary bg-primary/10 border-primary/30";
    case "done":
      return "text-chart-4 bg-chart-4/10 border-chart-4/30";
    case "failed":
      return "text-destructive bg-destructive/10 border-destructive/30";
    default:
      return "text-muted-foreground bg-muted/60 border-border";
  }
}

function statusLabel(status: HookStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function HookCard({ task }: { task: HookTask }) {
  return (
    <div className="rounded-3xl border-2 border-border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Webhook className="h-3.5 w-3.5 text-primary" />
            <span className="truncate text-xs font-semibold uppercase tracking-[0.18em]">{task.webhook_type}</span>
          </div>
          <p className="text-sm leading-6 text-foreground">{task.prompt}</p>
        </div>
        <span className={`shrink-0 border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusTone(task.status)}`}>
          {statusLabel(task.status)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" />
        <span>{formatDateTime(task.created_at)}</span>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Webhook filter</p>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-6 text-foreground">{formatJson(task.webhook_filter)}</pre>
      </div>

      {task.event_data ? (
        <div className="mt-3 rounded-2xl border border-border bg-background/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Event data</p>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-6 text-foreground">{formatJson(task.event_data)}</pre>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-border bg-background/80 p-3 text-sm text-muted-foreground">
          {task.status === "waiting" ? "Waiting for a matching webhook event." : "No event data was stored for this task."}
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-3xl border-2 border-border bg-card p-4 shadow-xs">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-xs font-semibold text-primary">{trend}</div>
    </div>
  );
}

function buildTrend(summary: HooksSummary | null): string {
  if (!summary) {
    return "Loading...";
  }

  const waiting = summary.summary.breakdown.waiting;
  const resumed = summary.summary.breakdown.resumed;
  const done = summary.summary.breakdown.done;
  const failed = summary.summary.breakdown.failed;

  return `${waiting} waiting, ${resumed} resumed, ${done} done, ${failed} failed`;
}

export default function HooksPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<HooksSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadHooksSummary = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setIsLoading(true);
    }

    setLoadError(null);

    try {
      const payload = await getHooksSummary();
      setSummary(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load hooks summary.";
      setLoadError(message);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    await loadHooksSummary(true);
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!isMounted) {
        return;
      }

      await loadHooksSummary(true);
    };

    void bootstrap();

    const intervalId = window.setInterval(() => {
      void loadHooksSummary(false);
    }, 12000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [loadHooksSummary]);

  const activeHooks = summary?.active ?? [];
  const inactiveHooks = summary?.inactive ?? [];
  const totals = summary?.summary ?? { total: 0, active_count: 0, inactive_count: 0, breakdown: { waiting: 0, resumed: 0, done: 0, failed: 0 } };

  return (
    <div className="h-full w-full overflow-hidden p-4 md:p-6">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4 rounded-[28px] border-2 border-border bg-card px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Hooks dashboard
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Hooks</h1>
              <p className="text-sm text-muted-foreground">
                Track waiting hooks in Active and completed or failed hooks in Inactive.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="border-2 border-border" onClick={() => void navigate("/app") }>
              Back to chat
            </Button>
            <Button className="border-2 border-border shadow-sm" onClick={() => void handleRefresh()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="flex items-start gap-2 border-2 border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {loadError}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryStat label="Total hooks" value={String(totals.total)} trend={buildTrend(summary)} />
          <SummaryStat label="Active" value={String(totals.active_count)} trend="Waiting + resumed" />
          <SummaryStat label="Inactive" value={String(totals.inactive_count)} trend="Done + failed" />
        </div>

        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-2">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 border-border bg-card shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4 border-b-2 border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">Active hooks</h2>
                <p className="text-sm text-muted-foreground">Waiting and resumed hooks that are still in flight.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-border">{totals.breakdown.waiting} waiting</Badge>
                <Badge variant="outline" className="border-border">{totals.breakdown.resumed} resumed</Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.96))] p-4 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_46%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.45))]">
              {isLoading ? (
                <div className="flex h-full min-h-80 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeHooks.length === 0 ? (
                <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-background/80 p-6 text-center">
                  <Webhook className="h-6 w-6 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">No active hooks</p>
                    <p className="text-xs text-muted-foreground">Waiting hooks and resumed hooks will appear here when they are in flight.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeHooks.map((task) => (
                    <HookCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 border-border bg-card shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4 border-b-2 border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">Inactive hooks</h2>
                <p className="text-sm text-muted-foreground">Completed and failed hooks kept for inspection.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-border">{totals.breakdown.done} done</Badge>
                <Badge variant="outline" className="border-border">{totals.breakdown.failed} failed</Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.96))] p-4 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_46%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.45))]">
              {isLoading ? (
                <div className="flex h-full min-h-80 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : inactiveHooks.length === 0 ? (
                <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-background/80 p-6 text-center">
                  <Webhook className="h-6 w-6 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">No inactive hooks</p>
                    <p className="text-xs text-muted-foreground">Finished hooks will land here once they complete or fail.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {inactiveHooks.map((task) => (
                    <HookCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}