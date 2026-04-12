import { SystemMetrics } from "../components/status/SystemMetrics";
import { ConnectorGrid } from "../components/status/ConnectorGrid";
import { Button } from "../components/ui/button";
import {
  Activity,
  Zap,
  Database,
  ArrowRightLeft,
  Bell,
  Settings,
  Network,
  Shield,
  PieChart,
  MoreHorizontal,
} from "lucide-react";

export default function StatusPage() {
  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-border pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time metrics and automation telemetry.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="border-2 border-border shadow-2xs">
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="border-2 border-border shadow-2xs">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Platform Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Automations" value="110,512" trend="+11.01%" isUp icon={<Zap className="w-4 h-4" />} />
          <StatCard title="Active Workflows" value="157,185" trend="+11.01%" isUp icon={<Activity className="w-4 h-4" />} />
          <StatCard title="API Requests" value="59,103" trend="-3.22%" isUp={false} icon={<ArrowRightLeft className="w-4 h-4" />} />
          <StatCard title="Data Processed" value="8,081 GB" trend="+11.01%" isUp icon={<Database className="w-4 h-4" />} />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Quick Actions</h2>
        <div className="border-2 border-border bg-card shadow-xs p-6">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <ActionButton color="bg-destructive/10" iconColor="text-destructive" icon={<Activity className="w-5 h-5" />} label="New Flow" />
            <ActionButton color="bg-chart-4/10" iconColor="text-chart-4" icon={<Database className="w-5 h-5" />} label="Connectors" />
            <ActionButton color="bg-primary/10" iconColor="text-primary" icon={<Shield className="w-5 h-5" />} label="Security" />
            <ActionButton color="bg-accent/20" iconColor="text-accent-foreground" icon={<Zap className="w-5 h-5" />} label="Billing" />
            <ActionButton color="bg-muted" iconColor="text-foreground" icon={<PieChart className="w-5 h-5" />} label="Reports" />
            <ActionButton color="bg-chart-2/10" iconColor="text-chart-2" icon={<Settings className="w-5 h-5" />} label="Settings" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">System History</h2>
          <div className="border-2 border-border bg-card shadow-xs p-6">
            <SystemMetrics />
          </div>
        </div>

        {/* Allocation Donut */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Allocation</h2>
          <div className="border-2 border-border bg-card shadow-xs p-6 h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <PieChart className="w-4 h-4 text-primary" />
                Usage Allocation
              </div>
              <button>
                <MoreHorizontal className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Resource distribution across integrations.</p>

            {/* Donut visual */}
            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-36 h-36 rounded-full border-[14px] border-chart-4 flex items-center justify-center relative" style={{
                borderRightColor: 'var(--primary)',
                borderTopColor: 'var(--destructive)',
              }}>
                <div className="text-center">
                  <span className="block text-2xl font-black">100%</span>
                </div>
              </div>

              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3 text-sm">
                <LegendItem color="bg-chart-4" label="Jira APIs" value="65%" />
                <LegendItem color="bg-primary" label="GitHub" value="20%" />
                <LegendItem color="bg-destructive" label="Slack" value="10%" />
                <LegendItem color="bg-muted-foreground" label="Other" value="5%" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connector Health */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Connector Health</h2>
        <ConnectorGrid />
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isUp, icon }: { title: string; value: string; trend: string; isUp: boolean; icon: React.ReactNode }) {
  return (
    <div className="p-5 border-2 border-border bg-card shadow-xs hover:shadow-sm transition-shadow group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
        <div className="w-8 h-8 bg-muted border-2 border-border flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <div className="font-black text-2xl tracking-tight mb-2">{value}</div>
      <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 border-2 border-border w-fit ${
        isUp ? 'bg-chart-4/10 text-chart-4' : 'bg-destructive/10 text-destructive'
      }`}>
        <span className={`w-1.5 h-1.5 ${isUp ? 'bg-chart-4' : 'bg-destructive'}`} />
        {trend} from last month
      </div>
    </div>
  );
}

function ActionButton({ color, iconColor, icon, label }: { color: string; iconColor: string; icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 group cursor-pointer">
      <div className={`w-14 h-14 ${color} border-2 border-border flex items-center justify-center group-hover:-translate-y-1 group-hover:shadow-sm transition-all ${iconColor}`}>
        {icon}
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 w-28">
      <span className={`w-2 h-2 ${color}`} />
      <span className="text-muted-foreground flex-1 text-xs">{label}</span>
      <span className="font-bold text-xs">{value}</span>
    </div>
  );
}
