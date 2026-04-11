agent: agent

# Phase B9 — Health Monitor

Use @backend-agent for this phase.

## Goal
Implement the background health monitoring task that polls all subsystems every 10
seconds, caches results, and broadcasts SSE events on status changes.

## Deliverables

### `backend/health/health_service.py`:
```python
# Module-level dict: _health_cache: dict[str, SubsystemHealth]
# SubsystemHealth = { status: "healthy"|"degraded"|"down", latency_ms: int, last_check: str }

# async def run_health_checks() -> None  — background loop
# Checks each subsystem with 5-second timeout:
#   - planner: call generate_dag with a minimal test input, measure latency
#   - executor: check active execution dict is accessible
#   - connector_library: ping DB connection
#   - log_service: verify write_log completes
# On status transition (e.g., healthy→degraded):
#   - Write WARN or ERROR log
#   - Broadcast { type: "subsystem_status_change", subsystem: "...", status: "..." } via SSE

# async def get_health_status() -> dict  — reads _health_cache only, no live checks
```

### Update `main.py`:
Start health check background task in the lifespan context manager:
```python
asyncio.create_task(health_service.run_health_checks())
```

### Update `gateway/router_health.py`:
Wire /api/health/subsystems to health_service.get_health_status()

## Self-Test ✅
```bash
# Start server, wait 15 seconds, then:
curl http://localhost:8000/api/health/subsystems
# Expected: JSON with all 4 subsystems showing status and latency_ms
# Should be "healthy" for all since DB is up and stubs respond fast
```

## 🎉 Backend Complete
After Phase B9 passes, the backend is ready for frontend integration.
All endpoints return real data shapes. SSE streams are working.
The only manual steps remaining are: LLM integration (B5) and OAuth app registration (B7/B8).