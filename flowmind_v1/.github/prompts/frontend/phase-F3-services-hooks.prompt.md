agent: agent

# Phase F3 — Services + Hooks (Non-SSE)

Use @frontend-agent for this phase.

## Goal
Implement all service files and all hooks except the SSE stream hook
(which is built in Phase F6 alongside the Execution Page).

## Deliverables

### `src/services/api.client.ts`:
Base fetch wrapper: handles errors uniformly, parses JSON, throws typed ApiError.

### `src/services/workflow.service.ts`:
generateDAG(), getPastWorkflows(), saveWorkflow() — call backend via api.client.ts

### `src/services/execution.service.ts`:
startExecution(), approveStep(), getExecutionStatus()

### `src/services/connector.service.ts`:
All 4 functions from Report 1 Section 11D:
getAvailableConnectors(), getConnectorStatus(), initiateConnect(), disconnectConnector()

### `src/hooks/useWorkflowSubmit.ts`:
NL input → call workflow.service.generateDAG() → dispatch to workflow.store → navigate to /dag

### `src/hooks/useConnectorStatus.ts`:
Polls GET /api/connectors/status every 30 seconds, updates connector.store

### `src/hooks/useWorkflowMemory.ts`:
Fetches past workflows from workflow.service.getPastWorkflows()

### `src/hooks/useConnectorOAuth.ts`:
Full OAuth popup flow from Report 1 Section 11E:
- connect(connectorName): calls initiateConnect() → opens popup → polls location → closes popup
- Returns: { connect, isConnecting, error, clearError }
- On success: calls connectorStore.refreshConnections()
- On popup-blocked or error: sets error string for Dialog display

## Self-Test ✅
```bash
cd frontend && npx tsc --noEmit
# Expected: 0 TypeScript errors
```