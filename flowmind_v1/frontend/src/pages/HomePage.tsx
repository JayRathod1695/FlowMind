import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Activity,
  Network,
  GitBranch,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    navigate("/app/connectors");
  };

  const templates = [
    "Summarize all Jira issues assigned to me and post to Slack",
    "Monitor GitHub PRs and send an email for failed CI builds",
    "Fetch Stripe invoices from last week and put them in Google Sheets",
  ];

  const recentWorkflows = [
    { name: "Jira → Slack Summary", status: "completed", time: "2m ago", steps: 4 },
    { name: "GitHub PR Monitor", status: "running", time: "Just now", steps: 6 },
    { name: "Stripe → Sheets", status: "error", time: "1h ago", steps: 3 },
  ];

  const stats = [
    { label: "Total Runs", value: "1,247", icon: <Zap className="w-4 h-4" />, trend: "+12%" },
    { label: "Active Workflows", value: "8", icon: <Activity className="w-4 h-4" />, trend: "+3" },
    { label: "Avg Latency", value: "42ms", icon: <Clock className="w-4 h-4" />, trend: "-8ms" },
    { label: "Success Rate", value: "99.2%", icon: <CheckCircle2 className="w-4 h-4" />, trend: "+0.5%" },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b-2 border-border pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, Arthur. Here's your workspace at a glance.</p>
        </div>
        <Button
          className="border-2 border-border shadow-sm"
          onClick={() => navigate("/app/dag")}
        >
          <GitBranch className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Stats Row */}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chat Input - Wider */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Agent</h2>
          <div className="border-2 border-border bg-card shadow-xs p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 border-2 border-border flex items-center justify-center text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">What can I automate for you?</h3>
                <p className="text-xs text-muted-foreground">Describe a workflow and I'll build it.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="border-2 border-border bg-background hover:shadow-xs transition-shadow">
                <textarea
                  className="w-full min-h-[80px] max-h-[160px] bg-transparent resize-none p-4 outline-none text-sm placeholder:text-muted-foreground/50 leading-relaxed font-sans"
                  placeholder="Type your workflow request here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <div className="flex items-center justify-between px-4 py-3 border-t-2 border-border bg-muted/30">
                  <span className="text-xs text-muted-foreground">Press Enter to send</span>
                  <Button
                    type="submit"
                    size="sm"
                    className="border-2 border-border shadow-xs"
                    disabled={prompt.length === 0}
                  >
                    Send
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </form>

            {/* Quick templates */}
            <div className="flex flex-wrap gap-2">
              {templates.map((txt, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(txt)}
                  className="px-3 py-1.5 border-2 border-border bg-muted/30 text-xs font-medium hover:bg-muted hover:shadow-2xs transition-all text-left truncate max-w-[240px]"
                >
                  {txt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Workflows */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Workflows</h2>
            <Button variant="ghost" size="xs" onClick={() => navigate("/app/execution")} className="text-xs text-muted-foreground">
              View all <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {recentWorkflows.map((wf, i) => (
              <div key={i} className="p-4 border-2 border-border bg-card shadow-2xs hover:shadow-xs transition-shadow cursor-pointer group"
                onClick={() => navigate("/app/execution")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm group-hover:text-primary transition-colors">{wf.name}</span>
                  <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 border-2 border-border ${
                    wf.status === 'completed' ? 'bg-chart-4/10 text-chart-4' :
                    wf.status === 'running' ? 'bg-primary/10 text-primary' :
                    'bg-destructive/10 text-destructive'
                  }`}>
                    <div className={`w-1.5 h-1.5 ${
                      wf.status === 'completed' ? 'bg-chart-4' :
                      wf.status === 'running' ? 'bg-primary animate-pulse' :
                      'bg-destructive'
                    }`} />
                    {wf.status}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{wf.steps} steps</span>
                  <span>{wf.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-2 border-border bg-card shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "New Flow", icon: <Network className="w-4 h-4" />, path: "/app/dag" },
                { label: "Connectors", icon: <GitBranch className="w-4 h-4" />, path: "/app/connectors" },
                { label: "Logs", icon: <Activity className="w-4 h-4" />, path: "/app/execution" },
                { label: "Metrics", icon: <Zap className="w-4 h-4" />, path: "/app/status" },
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
        </div>
      </div>
    </div>
  );
}
