agent: agent

# Phase B3 — API Gateway (All Routes)

Use @backend-agent for this phase.

## Goal
Implement all routes across the 5 gateway routers with proper Pydantic validation,
consistent response envelopes, and error handling. Routes return stubs for subsystems
not yet built (executor, planner, etc.) — use placeholder responses.

## Deliverables

### gateway/models.py — ALL Pydantic request/response models:
- GenerateDAGRequest: natural_language (str, 10-500 chars), available_connectors (list[str], 1-10 items)
- StartExecutionRequest: workflow_id, dag_json
- ApproveRequest: step_id, approved: bool
- ConnectRequest: user_id: str
- DisconnectRequest: user_id: str

### gateway/router_workflow.py:
- POST /api/workflow/generate → stub returns example DAG JSON
- GET /api/workflow/past → stub returns []
- POST /api/workflow/save → stub returns { workflow_id: "stub-id" }

### gateway/router_execution.py:
- POST /api/execution/start → stub returns { execution_id: "stub", status: "running" }
- POST /api/execution/:id/approve → stub
- GET /api/execution/:id/status → stub

### gateway/router_logs.py:
- GET /api/logs/stream (SSE) → stub that yields one heartbeat every 5s then stops
- GET /api/logs/query → stub returns { entries: [], total: 0, filtered: 0 }

### gateway/router_health.py:
- GET /api/health → { status: "ok", uptime_seconds: X }
- GET /api/health/subsystems → { subsystems: { planner: "healthy", executor: "healthy" } }

### gateway/router_connectors.py:
- GET /api/connectors/available → stub returns 4 connectors (jira, github, slack, sheets)
- GET /api/connectors/status → stub returns all disconnected
- POST /api/connectors/:name/connect → stub returns { auth_url: "https://example.com" }
- GET /api/connectors/:name/callback → redirects to /connectors?connected=name
- POST /api/connectors/:name/disconnect → stub returns { success: true }

### gateway/middleware.py:
- CORS middleware (from config)
- Request logging middleware (logs method + path at DEBUG level)
- Global exception handler (catches all, returns INTERNAL_ERROR envelope)

## Self-Test ✅
```bash
# Server must be running from Phase B1
curl -X POST http://localhost:8000/api/workflow/generate \
  -H "Content-Type: application/json" \
  -d '{"natural_language": "Create a Jira ticket and notify Slack", "available_connectors": ["jira", "slack"]}'
# Expected: {"success": true, "data": {...DAG stub...}}

curl http://localhost:8000/api/connectors/available
# Expected: {"success": true, "data": {"connectors": [...]}}
```