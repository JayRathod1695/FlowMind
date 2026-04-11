agent: agent

# Phase B4 — Log Service

Use @backend-agent for this phase.

## Goal
Implement the full logging subsystem: write_log() function, SQLite storage,
in-memory broadcast queue for SSE, and the real SSE streaming endpoint.

## Deliverables

### `backend/log_service/`:
Create this module (new folder alongside gateway/, planner/, etc.):

**log_service/log_writer.py**:
```python
# write_log() — NEVER raises, fire-and-forget
# Signature: async def write_log(level, subsystem, action, data=None,
#            duration_ms=None, trace_id=None, execution_id=None) -> None
# 1. Writes to log_entries SQLite table
# 2. Puts entry into the in-memory broadcast queue (asyncio.Queue)
# 3. Wraps entire function body in try/except Exception: pass
```

**log_service/log_stream.py**:
```python
# Manages SSE subscriber queues
# subscribe(execution_id) -> asyncio.Queue
# unsubscribe(execution_id, queue)
# broadcast(entry) — puts entry into all matching subscriber queues
```

**log_service/log_query.py**:
```python
# query_logs(level=None, subsystem=None, from_time=None, limit=100)
# Returns list of log entries from SQLite
```

### Update `gateway/router_logs.py`:
Replace SSE stub with real implementation using log_stream.subscribe().
The SSE generator must also send heartbeat comments (": heartbeat\n\n") every 15s.

### Update all other gateway stubs:
Add write_log() calls for request_received (DEBUG) at the top of each route handler.

## ⚠️ NO SELF-TEST REQUIRED
The SSE stream requires a frontend client to verify visually.
Manual verification: run the server, open browser to `http://localhost:8000/api/logs/stream?execution_id=test`
You should see the heartbeat `: heartbeat` lines every 15 seconds.