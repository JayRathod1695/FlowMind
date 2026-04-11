---
applyTo: "frontend/**"
---

# Frontend Instructions — React 18 + Vite + TypeScript

## State Management (Zustand)
- 4 stores only: workflow.store.ts, execution.store.ts, log.store.ts, connector.store.ts
- Each store slice is independent — SSE updates to connector.store must NOT
  trigger re-renders in workflow or DAG components
- No React Context for real-time data — it causes full-tree re-renders

## TypeScript Rules
- strict mode on — every file is .tsx or .ts
- No `any` types — use `unknown` and narrow
- All API response shapes have matching Pydantic-mirrored TypeScript interfaces

## Component Rules
- Components that receive SSE-driven data: wrap with React.memo()
- DAG nodes: memoize with React.memo — only re-render when that node's status changes
- Log entries: virtualize with @tanstack/react-virtual — NEVER render all entries
- ConnectorCard: React.memo — SSE connection changes only re-render the affected card

## Routing Pattern (react-router-dom v6)
```tsx
// All pages except HomePage are lazy-loaded
const DAGPage = React.lazy(() => import('./pages/DAGPage'));

// Route guard pattern
function RequireDAG({ children }: { children: ReactNode }) {
  const dag = useWorkflowStore(s => s.generatedDAG);
  return dag ? children : <Navigate to="/" replace />;
}
```

## SSE (EventSource) Pattern
```tsx
// Native EventSource — zero library needed
const source = new EventSource(`/api/logs/stream?execution_id=${id}`);
source.onmessage = (e) => {
  const event = JSON.parse(e.data);
  switch (event.type) {
    case 'log': logStore.addEntry(event.entry); break;
    case 'step_status': executionStore.setStepStatus(event.step_id, event.status); break;
    case 'connector_status_change': connectorStore.setConnection(...); break;
  }
};
// ALWAYS close on cleanup:
return () => source.close();
```

## OAuth Popup Pattern
```tsx
// useConnectorOAuth hook pattern
const popup = window.open(authUrl, 'oauth', 'width=600,height=700');
const poll = setInterval(() => {
  try {
    if (popup?.location.href.includes('/connectors?connected=')) {
      clearInterval(poll);
      popup.close();
      connectorStore.refreshConnections();
    }
  } catch { /* cross-origin — still loading */ }
}, 500);
```

## shadcn/ui Usage
- Dialog: OAuth error modal when popup blocked or initiation fails
- Button: all CTAs — approve/reject/connect/disconnect/submit
- Card: connector health cards, connector library cards
- Badge: log level badges, confidence scores, connector status
- ScrollArea: log viewer scroll container
- Tooltip: DAG node hover details
- Separator: execution panel section dividers

## Bundle Rules
- Initial bundle (HomePage) < 200KB gzipped
- ECharts: import individual charts only: `import { LineChart } from 'echarts/charts'`
- All pages except HomePage: lazy-load via React.lazy()