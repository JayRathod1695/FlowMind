import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from gateway.response_helpers import success_response
from health.health_service import get_health_status
from log_service import write_log

router = APIRouter()
START_TIME_MONOTONIC = time.monotonic()


@router.get("/api/health")
async def health_check() -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "GET", "path": "/api/health"},
    )
    uptime_seconds = int(time.monotonic() - START_TIME_MONOTONIC)
    return success_response({"status": "ok", "uptime_seconds": uptime_seconds})


@router.get("/api/health/subsystems")
async def subsystem_health_check() -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "GET", "path": "/api/health/subsystems"},
    )
    status_payload = await get_health_status()
    return success_response(status_payload)
