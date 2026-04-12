import { Card } from "../ui/card";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const MOCK_DATA = [
  { time: '1', ms: 12 }, { time: '2', ms: 14 }, { time: '3', ms: 11 }, { time: '4', ms: 15 },
  { time: '5', ms: 12 }, { time: '6', ms: 13 }, { time: '7', ms: 10 }, { time: '8', ms: 12 }
];

export function ConnectorGrid() {
  const connectors = [
    { name: "Jira API", status: "healthy", avg: "12ms", color: "var(--chart-1)" },
    { name: "GitHub API", status: "healthy", avg: "8ms", color: "var(--chart-2)" },
    { name: "Slack API", status: "degraded", avg: "154ms", color: "var(--chart-3)" },
    { name: "MCP Core Gateway", status: "healthy", avg: "4ms", color: "var(--primary)" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {connectors.map((c, i) => (
        <div key={i} className="p-4 flex flex-col gap-2 relative overflow-hidden group border-2 border-border bg-card shadow-xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between z-10">
            <h4 className="font-bold">{c.name}</h4>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${c.status === 'healthy' ? 'bg-chart-4 animate-pulse' : 'bg-accent'}`} />
              <span className="text-sm font-semibold text-muted-foreground capitalize">{c.status}</span>
            </div>
          </div>
          <div className="z-10">
            <span className="text-2xl font-black tracking-tight">{c.avg}</span>
            <span className="text-xs text-muted-foreground ml-1">avg latency</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 group-hover:opacity-60 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DATA}>
                <Area
                  type="monotone"
                  dataKey="ms"
                  stroke={c.color}
                  fill={c.color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
