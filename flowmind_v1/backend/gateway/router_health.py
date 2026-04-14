import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from executor.agent_runtime import runtime_status
from gateway.response_helpers import success_response

router = APIRouter()
START_TIME_MONOTONIC = time.monotonic()


@router.get("/api/health")
async def health_check() -> JSONResponse:
    uptime_seconds = int(time.monotonic() - START_TIME_MONOTONIC)
    agent_status = runtime_status()
    return success_response({
        "status": "ok",
        "uptime_seconds": uptime_seconds,
        "runtime_initialized": agent_status["runtime_initialized"],
        "tool_count": agent_status["tool_count"],
        "failed_servers": agent_status["failed_servers"],
    })
