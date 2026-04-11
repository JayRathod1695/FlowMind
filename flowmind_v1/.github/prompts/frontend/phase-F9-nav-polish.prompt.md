agent: agent

# Phase F9 — Navigation Polish + Error Boundaries + Bundle Check

Use @frontend-agent for this phase.

## Goal
Final polish: complete the NavigationBar with warning indicators, add error boundaries,
verify TypeScript is clean, and check bundle sizes.

## Deliverables

### `src/lib/error-boundary.tsx`:
React ErrorBoundary class component wrapping the entire app.
Fallback UI: centered card with error message + "Reload" button.

### `src/lib/logger.ts`:
FrontendLog interface + POST to backend /api/logs (fire-and-forget, never throws)
Log these events: workflow_submitted, dag_generation_started/completed/failed,
execution_started, step_approved, step_rejected, page_navigated,
connector_connect_initiated, connector_connect_completed, connector_disconnect

### Update `src/components/shared/NavigationBar.tsx`:
Confirm warning dot on Connections link is wired to connector.store
Active route highlighting using useLocation()

### Wire logger.ts to key user actions:
In useWorkflowSubmit: log workflow_submitted
In useConnectorOAuth: log connect_initiated and connect_completed

### Bundle Size Verification:
```bash
cd frontend && npm run build
# Check dist/ output — look for:
# Initial chunk (index.js): < 200KB gzipped
# Total: < 800KB gzipped
# ECharts should NOT appear in initial chunk
```

### Final TypeScript check:
```bash
npx tsc --noEmit
# Expected: 0 errors
```

## Self-Test ✅
```bash
npm run build
# No build errors
# Navigate all 5 routes in the built version — no white-screen crashes
# Check Connections nav link shows warning dot when a connector has status 'error'
```

## 🎉 Frontend Complete
FlowMind is fully built. Integration testing:
1. Start backend: `cd backend && uvicorn main:app --port 8000 --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Enter a workflow → generate DAG → start execution → watch live logs