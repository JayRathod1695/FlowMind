import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Activity,
  GitBranch,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Hourglass,
} from "lucide-react";

import { Button } from "../components/ui/button";
import {
  planAgent,
  getChat,
  getChats,
  getHealthStatus,
  getWaitingTasks,
  type ChatListItem,
  type ChatRecord,
  type HealthStatus,
  type WaitingTask,
} from "@/lib/api";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [recentChats, setRecentChats] = useState<ChatListItem[]>([]);
  const [waitingTasks, setWaitingTasks] = useState<WaitingTask[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRecord | null>(null);
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Elapsed timer during submission
  useEffect(() => {
    if (!isSubmitting) {
      setElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(intervalId);
  }, [isSubmitting]);

  // Fetch health on mount
  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const status = await getHealthStatus();
        if (isMounted) setHealthStatus(status);
      } catch {
        if (isMounted) setHealthStatus(null);
      }
    };
    void fetchHealth();
    const intervalId = window.setInterval(() => void fetchHealth(), 10000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadChatData = async () => {
      try {
        const [chats, waiting] = await Promise.all([getChats(25), getWaitingTasks()]);
        if (!isMounted) return;
        setRecentChats(chats);
        setWaitingTasks(waiting);
      } catch {
        if (!isMounted) return;
        setRecentChats([]);
        setWaitingTasks([]);
      }
    };

    void loadChatData();
    const intervalId = window.setInterval(() => void loadChatData(), 10000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleSelectChat = async (chatId: string) => {
    setChatLoadingId(chatId);
    try {
      const chat = await getChat(chatId);
      setSelectedChat(chat);
    } catch {
      setSelectedChat(null);
    } finally {
      setChatLoadingId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) return;

    const userPrompt = prompt.trim();
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const plan = await planAgent(userPrompt);
      const chats = await getChats(25);
      setRecentChats(chats);
      navigate(`/app/plan/${plan.plan_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate plan.";
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const templates = [
    "Search the web for latest AI news and summarize the top 3 results",
    "List all open issues in my FlowMind repo on GitHub",
    "Send a message to #general on Slack saying: Hello from FlowMind!",
  ];

  const stats = useMemo(() => {
    const toolCount = healthStatus?.tool_count ?? 0;
    const serverStatus = healthStatus?.runtime_initialized ? "Ready" : "Loading...";
    const failedCount = healthStatus?.failed_servers?.length ?? 0;
    const uptime = healthStatus?.uptime_seconds ?? 0;
    const uptimeStr = uptime > 3600
      ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
      : uptime > 60
        ? `${Math.floor(uptime / 60)}m`
        : `${uptime}s`;

    return [
      {
        label: "Agent Status",
        value: serverStatus,
        icon: <Zap className="w-4 h-4" />,
        trend: healthStatus?.runtime_initialized ? "All systems go" : "Initializing...",
      },
      {
        label: "MCP Tools",
        value: String(toolCount),
        icon: <Activity className="w-4 h-4" />,
        trend: failedCount > 0 ? `${failedCount} servers failed` : "All servers connected",
      },
      {
        label: "Uptime",
        value: uptimeStr,
        icon: <Clock className="w-4 h-4" />,
        trend: "Backend running",
      },
      {
        label: "Health",
        value: healthStatus ? "OK" : "--",
        icon: <CheckCircle2 className="w-4 h-4" />,
        trend: healthStatus ? "Connected" : "Checking...",
      },
    ];
  }, [healthStatus]);

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 flex flex-col gap-8">
      <div className="flex items-center justify-between border-b-2 border-border pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Your AI agent is ready to execute tasks.</p>
        </div>
        <Button
          className="border-2 border-border shadow-sm"
          onClick={() => navigate("/app/status")}
        >
          <GitBranch className="w-4 h-4 mr-2" />
          System Status
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="p-5 border-2 border-border bg-card shadow-xs hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
              <div className="w-8 h-8 bg-muted border-2 border-border flex items-center justify-center text-primary">
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-black tracking-tight">{stat.value}</div>
            <div className="text-xs font-semibold text-primary mt-1">{stat.trend}</div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Agent Prompt */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Agent</h2>
          <div className="border-2 border-border bg-card shadow-xs p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 border-2 border-border flex items-center justify-center text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">What can I do for you?</h3>
                <p className="text-xs text-muted-foreground">Describe a task and I&apos;ll create an execution plan for your review.</p>
              </div>
            </div>

            <form onSubmit={(e) => { void handleSubmit(e); }}>
              <div className="border-2 border-border bg-background hover:shadow-xs transition-shadow">
                <textarea
                  className="w-full min-h-[80px] max-h-[160px] bg-transparent resize-none p-4 outline-none text-sm placeholder:text-muted-foreground/50 leading-relaxed font-sans"
                  placeholder="Type your task here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmit(e);
                    }
                  }}
                />
                <div className="flex items-center justify-between px-4 py-3 border-t-2 border-border bg-muted/30">
                  <span className="text-xs text-muted-foreground">
                    {isSubmitting
                      ? `📋 Generating plan... ${elapsedSeconds}s`
                      : "Press Enter to generate plan"}
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    className="border-2 border-border shadow-xs"
                    disabled={prompt.length === 0 || isSubmitting}
                  >
                    {isSubmitting ? "Planning..." : "Generate Plan"}
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </form>

            {submissionError && (
              <div className="border-2 border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {submissionError}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {templates.map((txt, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(txt)}
                  className="px-3 py-1.5 border-2 border-border bg-muted/30 text-xs font-medium hover:bg-muted hover:shadow-2xs transition-all text-left truncate max-w-[280px]"
                >
                  {txt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className="border-2 border-border bg-card shadow-2xs p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Chats</h3>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {recentChats.length === 0 && (
                  <div className="text-xs text-muted-foreground border-2 border-dashed border-border p-3">
                    No chats yet. Submit a prompt to create your first chat record.
                  </div>
                )}
                {recentChats.map((chat) => {
                  const isSelected = selectedChat?.id === chat.id;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => void handleSelectChat(chat.id)}
                      className={`w-full text-left p-3 border-2 transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{chat.prompt}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-1 border border-border bg-muted shrink-0">
                          {chat.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {new Date(chat.created_at).toLocaleString()}
                      </div>
                      {chatLoadingId === chat.id && (
                        <div className="text-[11px] text-primary mt-1">Loading details...</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="border-2 border-border bg-card shadow-2xs p-4">
              <div className="flex items-center gap-2 mb-3">
                <Hourglass className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Waiting Tasks</h3>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {waitingTasks.length === 0 && (
                  <div className="text-xs text-muted-foreground border-2 border-dashed border-border p-3">
                    No deferred tasks are waiting right now.
                  </div>
                )}
                {waitingTasks.map((task) => (
                  <div key={task.id} className="p-3 border-2 border-border bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide">{task.webhook_type}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-1 border border-border bg-background">
                        {task.status}
                      </span>
                    </div>
                    <div className="text-xs mt-1 line-clamp-2">{task.prompt}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {new Date(task.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {selectedChat && (
            <section className="border-2 border-border bg-card shadow-2xs p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chat Detail</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-1 border border-border bg-muted">
                  {selectedChat.status}
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground mb-1">Prompt</div>
                  <div className="p-3 border border-border bg-background whitespace-pre-wrap">{selectedChat.prompt}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground mb-1">Plan</div>
                  <pre className="p-3 border border-border bg-background overflow-auto max-h-[180px] text-[11px] leading-relaxed">
                    {JSON.stringify(selectedChat.plan_json, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground mb-1">Result</div>
                  <pre className="p-3 border border-border bg-background overflow-auto max-h-[180px] text-[11px] leading-relaxed">
                    {JSON.stringify(selectedChat.result_json, null, 2)}
                  </pre>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Quick Actions Sidebar */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</h2>
          <div className="p-4 border-2 border-border bg-card shadow-2xs">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "System Status", icon: <Activity className="w-4 h-4" />, path: "/app/status" },
                { label: "View Logs", icon: <GitBranch className="w-4 h-4" />, path: "/app/status" },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-2.5 p-3 border-2 border-border text-sm font-medium hover:bg-muted hover:shadow-xs transition-all text-left"
                >
                  <div className="text-primary">{action.icon}</div>
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Runtime Info */}
          {healthStatus && (
            <div className="p-4 border-2 border-border bg-card shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Runtime</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-semibold ${healthStatus.runtime_initialized ? "text-chart-4" : "text-primary"}`}>
                    {healthStatus.runtime_initialized ? "● Ready" : "○ Loading"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tools loaded</span>
                  <span className="font-semibold">{healthStatus.tool_count}</span>
                </div>
                {(healthStatus.failed_servers ?? []).length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Failed servers</span>
                    <span className="font-semibold text-destructive">{(healthStatus.failed_servers ?? []).join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
