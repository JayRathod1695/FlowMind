agent: agent

# Phase F7 — Status Page + Virtualized Log Viewer

Use @frontend-agent for this phase.
Reference `.github/skills/ui-ux-pro-max/` for design decisions.

## Goal
Build the complete Status page with ECharts real-time chart, connector health grid,
subsystem mini-graph, and the virtualized log viewer.

## Deliverables

### `src/components/logs/LogViewer.tsx` (max 200 lines):
```tsx
// Uses @tanstack/react-virtual for virtualization
// Renders only visible rows — constant paint time regardless of log count
// Auto-scrolls to bottom when new entries arrive (unless user has scrolled up)
// Uses LogBadge for level indicator
// Wrapped in shadcn ScrollArea
```

### `src/components/logs/LogFilters.tsx` (max 80 lines):
Level filter buttons (ALL, DEBUG, INFO, WARN, ERROR)
Subsystem dropdown
Updates log.store.filters

### `src/components/shared/LogBadge.tsx`:
Color-coded badge: DEBUG=grey, INFO=blue, WARN=yellow, ERROR=red

### `src/components/shared/StatusDot.tsx`:
- healthy: green animated pulse ring
- degraded: yellow static dot
- down: red flashing dot

### `src/components/status/ConnectorGrid.tsx` (max 80 lines):
2×2 grid of connector health cards
Each card: StatusDot + name + latency avg + Recharts sparkline (LineChart + ResponsiveContainer)

### `src/components/status/SystemMetrics.tsx` (max 150 lines):
ECharts real-time line chart — rolling 60-second window
Import only: `import { LineChart } from 'echarts/charts'` (not import *)
setOption with streaming data append mode

### `src/components/status/SubsystemGraph.tsx` (max 120 lines):
Mini @xyflow/react diagram (read-only, no interaction)
Hardcoded nodes: LLM Planner → DAG Executor → MCP Router, Log Service connected

### `src/pages/StatusPage.tsx`:
Layout matching wireframe from Report 1 Section 6:
ConnectorGrid (top), SystemMetrics (middle), SubsystemGraph (bottom), LogViewer (bottom)

## Self-Test ✅
```bash
cd frontend && npm run dev
# Navigate to /status
# ConnectorGrid should render 4 cards with grey StatusDots (all disconnected initially)
# SystemMetrics chart should render (empty/flat line is fine)
# SubsystemGraph should show the hardcoded mini-graph
# LogViewer should render (empty is fine)
npx tsc --noEmit
```