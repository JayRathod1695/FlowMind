from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import aiosqlite

from config import DB_PATH
from executor.executor_retry import with_retry
from log_service import write_log
from mcp_router import route_tool_call
from planner.planner_models import DAGNode


@dataclass(slots=True)
class StepResult:
    status: str
    output_json: dict[str, Any] | None
    duration_ms: int


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _serialize_json(payload: dict[str, Any] | None) -> str | None:
    if payload is None:
        return None
    return json.dumps(payload)


async def _upsert_step_row(
    *,
    execution_id: str,
    step: DAGNode,
    status: str,
    started_at: str | None,
    completed_at: str | None,
    duration_ms: int | None,
    output_json: dict[str, Any] | None,
    retry_count: int,
    error_message: str | None,
) -> None:
    try:
        async with aiosqlite.connect(DB_PATH) as database:
            await database.execute(
                """
                INSERT INTO execution_steps (
                    id,
                    execution_id,
                    step_id,
                    connector,
                    tool_name,
                    status,
                    started_at,
                    completed_at,
                    duration_ms,
                    input_json,
                    output_json,
                    retry_count,
                    error_message
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(execution_id, step_id)
                DO UPDATE SET
                    connector = excluded.connector,
                    tool_name = excluded.tool_name,
                    status = excluded.status,
                    started_at = excluded.started_at,
                    completed_at = excluded.completed_at,
                    duration_ms = excluded.duration_ms,
                    input_json = excluded.input_json,
                    output_json = excluded.output_json,
                    retry_count = excluded.retry_count,
                    error_message = excluded.error_message
                """,
                (
                    str(uuid.uuid4()),
                    execution_id,
                    step.id,
                    step.connector,
                    step.tool_name,
                    status,
                    started_at,
                    completed_at,
                    duration_ms,
                    _serialize_json(step.input),
                    _serialize_json(output_json),
                    retry_count,
                    error_message,
                ),
            )
            await database.commit()
    except Exception as error:
        raise RuntimeError("Failed to persist execution step state") from error


async def run_step(step: DAGNode, user_id: str, execution_id: str) -> StepResult:
    started_at_timestamp = _utc_timestamp()
    started_at_monotonic = time.monotonic()
    retry_attempt_count = 0
    max_attempts = getattr(step, "max_attempts", 3)

    if not isinstance(max_attempts, int) or max_attempts < 1:
        max_attempts = 3

    await _upsert_step_row(
        execution_id=execution_id,
        step=step,
        status="running",
        started_at=started_at_timestamp,
        completed_at=None,
        duration_ms=None,
        output_json=None,
        retry_count=0,
        error_message=None,
    )
    await write_log(
        "INFO",
        "executor",
        "step_started",
        {
            "execution_id": execution_id,
            "step_id": step.id,
            "connector": step.connector,
            "tool_name": step.tool_name,
            "user_id": user_id,
        },
        execution_id=execution_id,
    )

    async def _call_tool() -> dict[str, Any]:
        nonlocal retry_attempt_count
        retry_attempt_count += 1
        return await route_tool_call(step, user_id)

    try:
        output_json = await with_retry(_call_tool, max_attempts=max_attempts)
        duration_ms = int((time.monotonic() - started_at_monotonic) * 1000)
        retry_count = max(0, retry_attempt_count - 1)

        await _upsert_step_row(
            execution_id=execution_id,
            step=step,
            status="completed",
            started_at=started_at_timestamp,
            completed_at=_utc_timestamp(),
            duration_ms=duration_ms,
            output_json=output_json,
            retry_count=retry_count,
            error_message=None,
        )
        await write_log(
            "INFO",
            "executor",
            "step_completed",
            {
                "execution_id": execution_id,
                "step_id": step.id,
                "status": "completed",
                "retry_count": retry_count,
            },
            duration_ms=duration_ms,
            execution_id=execution_id,
        )
        return StepResult(
            status="completed",
            output_json=output_json,
            duration_ms=duration_ms,
        )
    except Exception as error:
        duration_ms = int((time.monotonic() - started_at_monotonic) * 1000)
        retry_count = max(0, retry_attempt_count - 1)
        await _upsert_step_row(
            execution_id=execution_id,
            step=step,
            status="failed",
            started_at=started_at_timestamp,
            completed_at=_utc_timestamp(),
            duration_ms=duration_ms,
            output_json=None,
            retry_count=retry_count,
            error_message=str(error),
        )
        await write_log(
            "ERROR",
            "executor",
            "step_failed",
            {
                "execution_id": execution_id,
                "step_id": step.id,
                "status": "failed",
                "retry_count": retry_count,
                "error_type": type(error).__name__,
                "message": str(error),
            },
            duration_ms=duration_ms,
            execution_id=execution_id,
        )
        raise