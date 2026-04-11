agent: agent

# Phase F6 — Execution Page + SSE Stream

Use @frontend-agent for this phase.

## Goal
Build the live execution monitoring page and the SSE hook that feeds it.
This is the most real-time-critical page — Zustand store isolation is essential.

## Deliverables

### `src/services/log.stream.service.ts`:
```ts
// SSEManager class
// connect(executionId: string): EventSource
// disconnect(): void
// Handles all SSE event types and routes them to correct stores:
//   'log' → logStore.addEntry()
//   'step_status' → executionStore.setStepStatus()
//   'approval_required' → executionStore.setPaused()
//   'execution_complete' → executionStore.setComplete()
//   'connector_status_change' → connectorStore.setConnection()
// Auto-reconnect on connection loss (EventSource does this natively)
```

### `src/hooks/useExecutionStream.ts`:
```ts
// Wraps SSEManager — connects on mount, disconnects on unmount
// Returns: { isConnected: boolean }
```

### `src/components/execution/ExecutionPanel.tsx` (max 100 lines):
Maps execution steps to ExecutionPanel.step.tsx rows
Reads from execution.store

### `src/components/execution/ExecutionPanel.step.tsx` (max 120 lines):
Single step row: status icon (animated), tool name, duration, expand button to see input/output payload

### `src/components/execution/ApprovalGate.tsx` (max 80 lines):
Large APPROVE / REJECT buttons
Shown only when execution.store.isPaused === true
Calls execution.service.approveStep()

### `src/pages/ExecutionPage.tsx`:
- Uses useExecutionStream() — starts SSE on mount
- ApprovalGate (conditionally rendered when paused)
- ExecutionPanel (step list)
- LogViewer (from Phase F7 — use a placeholder for now)

## ⚠️ MANUAL VERIFICATION REQUIRED
Full testing requires the backend running with a real execution.
Manual test after backend Phase B6 is running:
1. Start a workflow from the frontend
2. Navigate to /execution/:id
3. Verify step status dots update in real-time as SSE events arrive