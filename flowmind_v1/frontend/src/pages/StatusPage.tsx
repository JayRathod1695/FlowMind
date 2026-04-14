import { useEffect, useMemo, useState } from "react";

import { SystemMetrics } from "../components/status/SystemMetrics";
import { Button } from "../components/ui/button";
import {
  Activity,
  Zap,
  Database,
  ArrowRightLeft,
  Bell,
  Settings,
  RefreshCw,
} from "lucide-react";

import {
  getHealthStatus,
  getAgentRuntimeStatus,
  queryLogs,
  type HealthStatus,
  type AgentRuntimeStatus,
  type LogQueryEntry,
} from "@/lib/api";

function formatBytes(byteCount: number): string {
  if (byteCount < 1024) return `${byteCount} B`;
  if (byteCount < 1024 * 1024) return `${(byteCount / 1024).toFixed(1)} KB`;
  return `${(byteCount / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [runtime, setRuntime] = useState<AgentRuntimeStatus | null>(null);
  const [logs, setLogs] = useState<LogQueryEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [healthData, runtimeData, logData] = await Promise.all([
        getHealthStatus(),
        getAgentRuntimeStatus(),
        queryLogs({ limit: 200 }),
      ]);
      setHealth(healthData);
      setRuntime(runtimeData);
      setLogs(logData);
    } catch {
      // Keep existing data on error
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [healthData, runtimeData, logData] = await Promise.all([
          getHealthStatus(),
          getAgentRuntimeStatus(),
          queryLogs({ limit: 200 }),
        ]);
        if (!isMounted) return;
        setHealth(healthData);
        setRuntime(runtimeData);
        setLogs(logData);
      } catch {
        // ignore
      }
    };
    void load();
    const intervalId = window.setInterval(() => void load(), 15000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const uptimeStr = useMemo(() => {
    const uptime = health?.uptime_seconds ?? 0;
    if (uptime > 3600) return `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
    if (uptime > 60) return `${Math.floor(uptime / 60)}m ${uptime % 60}s`;
    return `${uptime}s`;
  }, [health]);

  const dashboardStats = useMemo(() => {
    const dataBytes = logs.reduce((sum, entry) => sum + JSON.stringify(entry).length, 0);
    const errorCount = logs.filter(e => e.level === "ERROR").length;

    return [
      {
        title: "Agent Status",
        value: health?.runtime_initialized ? "Ready" : "Loading",
        trend: health?.runtime_initialized ? "All systems go" : "Initializing...",
        isUp: health?.runtime_initialized ?? false,
        icon: <Zap className="w-4 h-4" />,
      },
      {
        title: "MCP Tools",
        value: String(health?.tool_count ?? 0),
        trend: `${health?.failed_servers?.length ?? 0} servers failed`,
        isUp: (health?.tool_count ?? 0) > 0,
        icon: <Activity className="w-4 h-4" />,
      },
      {
        title: "Log Events",
        value: logs.length.toLocaleString(),
        trend: errorCount > 0 ? `${errorCount} errors` : "No errors",
        isUp: errorCount === 0,
        icon: <ArrowRightLeft className="w-4 h-4" />,
      },
      {
        title: "Uptime",
        value: uptimeStr,
        trend: formatBytes(dataBytes) + " log data",
        isUp: (health?.uptime_seconds ?? 0) > 0,
        icon: <Database className="w-4 h-4" />,
      },
    ];
  }, [health, logs, uptimeStr]);

  const latencySeries = useMemo(() => {
    const entries = logs
      .filter((entry) => typeof entry.duration_ms === "number")
      .slice(0, 12)
      .reverse();
    return entries.map((entry, index) => ({
      label: `${index + 1}`,
      value: Number(entry.duration_ms),
    }));
  }, [logs]);

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-border pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">System Status</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time agent health and system metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-2 border-border shadow-2xs"
            onClick={() => void loadData()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="icon" className="border-2 border-border shadow-2xs">
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="border-2 border-border shadow-2xs">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Platform Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardStats.map((stat) => (
            <div key={stat.title} className="p-5 border-2 border-border bg-card shadow-xs hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{stat.title}</span>
                <div className="w-8 h-8 bg-muted border-2 border-border flex items-center justify-center text-primary">
                  {stat.icon}
                </div>
              </div>
              <div className="font-black text-2xl tracking-tight mb-2">{stat.value}</div>
              <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 border-2 border-border w-fit ${
                stat.isUp ? 'bg-chart-4/10 text-chart-4' : 'bg-destructive/10 text-destructive'
              }`}>
                <span className={`w-1.5 h-1.5 ${stat.isUp ? 'bg-chart-4' : 'bg-destructive'}`} />
                {stat.trend}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts + Runtime */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Request Latency</h2>
          <div className="border-2 border-border bg-card shadow-xs p-6">
            <SystemMetrics points={latencySeries} />
          </div>
        </div>

        {/* Runtime Info */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Runtime Details</h2>
          <div className="border-2 border-border bg-card shadow-xs p-6 space-y-4">
            <div className="space-y-3">
              <InfoRow label="Runtime" value={runtime?.runtime_initialized ? "● Initialized" : "○ Loading"} positive={runtime?.runtime_initialized} />
              <InfoRow label="Tools Loaded" value={String(runtime?.tool_count ?? 0)} positive={(runtime?.tool_count ?? 0) > 0} />
              <InfoRow label="Waiting Tasks" value={String(runtime?.waiting_task_count ?? 0)} positive />
              {(runtime?.failed_servers?.length ?? 0) > 0 && (
                <InfoRow label="Failed Servers" value={(runtime?.failed_servers ?? []).join(", ")} positive={false} />
              )}
            </div>

            {runtime?.waiting_tasks && runtime.waiting_tasks.length > 0 && (
              <div className="border-t-2 border-border pt-3">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Queued Tasks</div>
                {runtime.waiting_tasks.map((task) => (
                  <div key={task.id} className="text-xs flex justify-between py-1">
                    <span className="font-mono text-muted-foreground">{task.id}</span>
                    <span className="font-semibold">{task.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Logs */}
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Recent Logs</h2>
          <div className="border-2 border-border bg-card shadow-xs p-4 max-h-64 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-xs text-muted-foreground">No logs yet</div>
            ) : (
              logs.slice(0, 20).map((entry) => (
                <div key={entry.id} className="text-xs py-1.5 border-b border-border/40 last:border-0 flex items-start gap-2">
                  <span className={`font-bold shrink-0 w-10 ${
                    entry.level === "ERROR" ? "text-destructive" : entry.level === "WARN" ? "text-amber-500" : "text-muted-foreground"
                  }`}>
                    {entry.level}
                  </span>
                  <span className="text-muted-foreground shrink-0">{entry.subsystem}</span>
                  <span className="font-medium truncate">{entry.action}</span>
                  {entry.duration_ms != null && (
                    <span className="text-muted-foreground ml-auto shrink-0">{entry.duration_ms}ms</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${positive ? "text-chart-4" : positive === false ? "text-destructive" : ""}`}>
        {value}
      </span>
    </div>
  );
}
