---
applyTo: "backend/**"
---

# Backend Instructions — FastAPI + Python 3.11

## Module Imports
- FastAPI, uvicorn, pydantic, aiosqlite: standard usage
- LLM SDK: imported ONLY in `planner/planner_service.py` — nowhere else
- Connector SDKs: imported ONLY in their respective `mcp_router/connector_*.py` file
- token_encryption: imported ONLY in `connector_library/library_service.py`
- This isolation is enforced by architecture — do NOT break it

## Async Rules
- All DB calls use `aiosqlite` with `async with` — never synchronous sqlite3
- All HTTP calls use `httpx.AsyncClient` with `async with`
- All subsystem functions that do I/O must be `async def`
- Health check results are CACHED — the background task writes to a dict,
  the endpoint reads from that dict. Never run live checks on-demand.

## FastAPI Patterns
```python
# Standard route pattern
@router.post("/api/execution/start")
async def start_execution(req: StartExecutionRequest) -> JSONResponse:
    try:
        result = await executor_service.execute_dag(req.workflow_id, req.dag_json)
        return JSONResponse({"success": True, "data": result})
    except ExecutorBusyError:
        return JSONResponse({"success": False, "error": {"code": "EXECUTOR_BUSY",
            "message": "An execution is already running"}}, status_code=409)
    except Exception as e:
        await write_log("FATAL", "gateway", "error_caught",
                        {"error_type": type(e).__name__, "message": str(e)})
        return JSONResponse({"success": False, "error": {"code": "INTERNAL_ERROR",
            "message": "Unexpected error"}}, status_code=500)
```

## Pydantic v2 Patterns
```python
from pydantic import BaseModel, Field

class GenerateDAGRequest(BaseModel):
    natural_language: str = Field(..., min_length=10, max_length=500)
    available_connectors: list[str] = Field(..., min_length=1, max_length=10)
```

## Database Pattern (aiosqlite)
```python
async def write_log(level, subsystem, action, data=None, ...):
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("INSERT INTO log_entries ...", (...))
            await db.commit()
    except Exception:
        pass  # Log service NEVER raises — fire and forget
```

## SSE Pattern
```python
async def log_stream_generator(execution_id: str):
    while True:
        # yield from in-memory queue
        entry = await log_queue.get()
        yield f"data: {json.dumps({'type': 'log', 'entry': entry})}\n\n"

@router.get("/api/logs/stream")
async def stream_logs(execution_id: str = Query(...)):
    return StreamingResponse(
        log_stream_generator(execution_id),
        media_type="text/event-stream"
    )
```

## CORS (from .env)
```python
app.add_middleware(CORSMiddleware,
    allow_origins=[os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"])
```