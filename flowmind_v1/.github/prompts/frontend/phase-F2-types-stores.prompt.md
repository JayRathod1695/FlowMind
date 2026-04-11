agent: agent

# Phase F2 — Type Definitions + Zustand Stores

Use @frontend-agent for this phase.

## Goal
Implement all 4 TypeScript type files and all 4 Zustand stores exactly as specified
in Report 1 Sections 3 (types) and 5 (stores).

## Deliverables

### `src/types/workflow.types.ts`:
DAGNode, DAGEdge, Workflow, WorkflowStatus types

### `src/types/execution.types.ts`:
ExecutionStep, ExecutionStatus, StepStatus types

### `src/types/log.types.ts`:
LogEntry, LogLevel ('DEBUG'|'INFO'|'WARN'|'ERROR'), LogFilter types

### `src/types/connector.types.ts`:
All 4 types from Report 1 Section 11C:
- ConnectorHealthStatus, ConnectorConnectionStatus, ConnectorConnection, AvailableConnector

### `src/store/workflow.store.ts`:
```ts
// Zustand store matching exact WorkflowStore interface from Report 1 Section 5
// naturalLanguageInput, generatedDAG, generatedEdges, workflowConfidence,
// isGenerating, setInput, setDAG, reset
```

### `src/store/execution.store.ts`:
```ts
// Matches ExecutionStore interface from Report 1 Section 5
// executionId, stepStatuses, isRunning, isPaused, pendingApprovalStepId,
// setStepStatus, setPaused, setComplete
```

### `src/store/log.store.ts`:
```ts
// entries: LogEntry[], filters: LogFilter, addEntry, setFilter, clearEntries
```

### `src/store/connector.store.ts`:
```ts
// Matches updated ConnectorStore interface from Report 1 Section 5:
// healthStatuses + setHealthStatus (existing)
// connections + setConnection + refreshConnections (NEW)
```

## Self-Test ✅
```bash
cd frontend && npx tsc --noEmit
# Expected: 0 TypeScript errors — all types and stores compile cleanly
```