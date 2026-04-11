agent: agent

# Phase B6 — DAG Executor

Use @backend-agent for this phase.

## Goal
Implement the DAG Executor that runs steps in topological order with retry logic,
approval gates, and SSE status broadcasting. Uses MCP Router (stub) for tool calls.

## Deliverables

### `backend/executor/executor_graph.py`:
```python
# topological_sort(nodes: list[DAGNode], edges: list[DAGEdge]) -> list[list[DAGNode]]
# Returns layers — nodes in same layer can run in parallel (future optimization)
# Pure function, no I/O, no side effects
```

### `backend/executor/executor_retry.py`:
```python
# async def with_retry(coro_factory, max_attempts=3, base_delay=1.0)
# Exponential backoff: 1s, 2s, 4s
# Logs retry_triggered WARN on each attempt
# Raises original exception after max_attempts
```

### `backend/executor/executor_runner.py`:
```python
# async def run_step(step: DAGNode, user_id: str, execution_id: str) -> StepResult
# 1. Log step_started INFO
# 2. Call mcp_router.route_tool_call(step, user_id) — use stub for now
# 3. Log step_completed INFO with duration_ms
# 4. Update execution_steps table
# Returns StepResult(status, output_json, duration_ms)
```

### `backend/executor/executor_service.py`:
```python
# async def execute_dag(workflow_id, dag_json, user_id, execution_id) -> None
# 1. Topological sort
# 2. For each layer: run steps (sequential for now)
# 3. If step has requires_approval=True: pause, emit approval_required SSE event,
#    wait for approval via asyncio.Event
# 4. Broadcast step_status SSE events via log_service
# 5. On completion: broadcast execution_complete SSE event
# 6. Active execution state stored in module-level dict (in-memory)
```

### Update gateway/router_execution.py:
Wire start_execution to executor_service.execute_dag()
Wire approve endpoint to set the asyncio.Event for the paused step

## Self-Test ✅
```bash
# With server running, POST a start with the stub planner DAG:
curl -X POST http://localhost:8000/api/execution/start \
  -d '{"workflow_id": "test", "dag_json": "<paste stub DAG from Phase B5>"}'
# Expected: { "success": true, "data": { "execution_id": "...", "status": "running" } }
# Check logs: GET http://localhost:8000/api/logs/query
# Expected: log entries for step_started events
```