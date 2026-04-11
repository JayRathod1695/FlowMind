from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Awaitable, Callable, Literal, TypedDict

import aiosqlite

from config import DB_PATH
from executor.executor_service_helpers import ACTIVE_EXECUTIONS, ACTIVE_EXECUTIONS_LOCK
from log_service import broadcast, write_log
from planner.planner_service import generate_dag

HealthStatus = Literal["healthy", "degraded", "down"]


class SubsystemHealth(TypedDict):
    status: HealthStatus
    latency_ms: int
    last_check: str


SubsystemCheck = Callable[[], Awaitable[None]]

CHECK_INTERVAL_SECONDS = 10
CHECK_TIMEOUT_SECONDS = 5
DEGRADED_LATENCY_THRESHOLD_MS = 1_500
SUBSYSTEMS = ("planner", "executor", "connector_library", "log_service")


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


_health_cache: dict[str, SubsystemHealth] = {
    name: {"status": "down", "latency_ms": 0, "last_check": _utc_timestamp()}
    for name in SUBSYSTEMS
}
_health_cache_lock = asyncio.Lock()


async def _check_planner() -> None:
    planner_result = await generate_dag(
        natural_language="Health monitor validation workflow",
        available_connectors=["jira"],
    )
    if not planner_result.nodes:
        raise RuntimeError("Planner check returned no nodes")


async def _check_executor() -> None:
    async with ACTIVE_EXECUTIONS_LOCK:
        _ = len(ACTIVE_EXECUTIONS)


async def _check_connector_library() -> None:
    async with aiosqlite.connect(DB_PATH) as database:
        cursor = await database.execute("SELECT 1")
        row = await cursor.fetchone()
        await cursor.close()
    if row is None:
        raise RuntimeError("Connector library DB ping failed")


async def _check_log_service() -> None:
    trace_id = f"health-log-{time.time_ns()}"
    await write_log(
        "DEBUG",
        "health_monitor",
        "log_service_probe",
        {"source": "health_monitor"},
        trace_id=trace_id,
    )

    async with aiosqlite.connect(DB_PATH) as database:
        cursor = await database.execute(
            "SELECT 1 FROM log_entries WHERE trace_id = ? LIMIT 1",
            (trace_id,),
        )
        row = await cursor.fetchone()
        await cursor.close()

    if row is None:
        raise RuntimeError("Log service probe was not persisted")


def _latency_to_status(latency_ms: int) -> HealthStatus:
    return (
        "degraded"
        if latency_ms > DEGRADED_LATENCY_THRESHOLD_MS
        else "healthy"
    )


async def _run_single_check(
    subsystem: str,
    check_function: SubsystemCheck,
) -> tuple[str, SubsystemHealth, str | None]:
    started_at = time.perf_counter()
    last_check = _utc_timestamp()

    try:
        await asyncio.wait_for(check_function(), timeout=CHECK_TIMEOUT_SECONDS)
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        return (
            subsystem,
            {
                "status": _latency_to_status(latency_ms),
                "latency_ms": latency_ms,
                "last_check": last_check,
            },
            None,
        )
    except asyncio.TimeoutError:
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        return (
            subsystem,
            {"status": "down", "latency_ms": latency_ms, "last_check": last_check},
            f"Timed out after {CHECK_TIMEOUT_SECONDS} seconds",
        )
    except Exception as error:
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        return (
            subsystem,
            {"status": "down", "latency_ms": latency_ms, "last_check": last_check},
            f"{type(error).__name__}: {error}",
        )


async def _emit_status_transition(
    subsystem: str,
    old_status: HealthStatus,
    new_health: SubsystemHealth,
    error_message: str | None,
) -> None:
    level = "ERROR" if new_health["status"] == "down" else "WARN"
    await write_log(
        level,
        "health_monitor",
        "subsystem_status_change",
        {
            "subsystem": subsystem,
            "from_status": old_status,
            "to_status": new_health["status"],
            "latency_ms": new_health["latency_ms"],
            "error_message": error_message,
        },
    )
    await broadcast(
        {
            "type": "subsystem_status_change",
            "subsystem": subsystem,
            "status": new_health["status"],
            "latency_ms": new_health["latency_ms"],
            "last_check": new_health["last_check"],
        }
    )


async def _persist_check_result(
    subsystem: str,
    new_health: SubsystemHealth,
    error_message: str | None,
) -> None:
    old_status: HealthStatus | None = None

    async with _health_cache_lock:
        old_health = _health_cache.get(subsystem)
        if old_health is not None:
            old_status = old_health["status"]
        _health_cache[subsystem] = {
            "status": new_health["status"],
            "latency_ms": new_health["latency_ms"],
            "last_check": new_health["last_check"],
        }

    if old_status is not None and old_status != new_health["status"]:
        await _emit_status_transition(subsystem, old_status, new_health, error_message)


async def _run_check_cycle() -> None:
    check_functions: dict[str, SubsystemCheck] = {
        "planner": _check_planner,
        "executor": _check_executor,
        "connector_library": _check_connector_library,
        "log_service": _check_log_service,
    }
    check_tasks = [
        _run_single_check(subsystem, check_function)
        for subsystem, check_function in check_functions.items()
    ]
    results = await asyncio.gather(*check_tasks)

    for subsystem, health, error_message in results:
        await _persist_check_result(subsystem, health, error_message)


async def run_health_checks() -> None:
    while True:
        try:
            await _run_check_cycle()
        except asyncio.CancelledError:
            return
        except Exception as error:
            await write_log(
                "ERROR",
                "health_monitor",
                "health_check_loop_failed",
                {
                    "error_type": type(error).__name__,
                    "message": str(error),
                },
            )

        await asyncio.sleep(CHECK_INTERVAL_SECONDS)


async def get_health_status() -> dict[str, dict[str, SubsystemHealth]]:
    async with _health_cache_lock:
        cache_copy = {
            subsystem: {
                "status": health["status"],
                "latency_ms": health["latency_ms"],
                "last_check": health["last_check"],
            }
            for subsystem, health in _health_cache.items()
        }
    return {"subsystems": cache_copy}