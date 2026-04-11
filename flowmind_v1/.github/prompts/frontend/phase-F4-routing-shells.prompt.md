agent: agent

# Phase F4 — Routing + Page Shells + Navigation

Use @frontend-agent for this phase.

## Goal
Implement App.tsx with all 5 routes, route guards, lazy loading, navigation bar,
and proper Suspense fallback skeletons.

## Deliverables

### `src/App.tsx` (max 50 lines):
```tsx
// Lazy import all pages except HomePage
// Routes from Report 1 Section 7:
// / → HomePage (no guard, eager)
// /dag → DAGPage (guard: redirect to / if no DAG in store)
// /execution/:id → ExecutionPage (guard: redirect to / if no execution ID)
// /status → StatusPage (no guard)
// /connectors → ConnectorsPage (no guard)
// Suspense fallback: skeleton div, not a spinner
```

### `src/components/shared/NavigationBar.tsx` (Report 1 Section 11H):
Links: Home, Status, Connections
Connections link shows a warning dot (orange) if any connector has status === 'error'
The warning dot reads from connector.store

### All 5 page files — implement as real shells (not just div):
Each page should have a proper title heading and the correct layout structure,
but components inside them can be placeholder text until their phase.

## Self-Test ✅
```bash
cd frontend && npm run dev
# Navigate to each route in browser:
# / → renders "FlowMind" heading
# /status → renders "Status" heading
# /connectors → renders "Connections" heading
# /dag → redirects to / (no DAG in store)
# /execution/test → redirects to / (no execution ID)
# No TypeScript errors: npx tsc --noEmit
```