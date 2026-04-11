from __future__ import annotations

import json
from typing import Any

import aiosqlite

from config import DB_PATH
from executor.executor_service_helpers import ExecutorNode, utc_timestamp


async def insert_execution_row(
    workflow_id: str,
    dag_json: dict[str, Any],
    execution_id: str,
) -> None:
    try:
        async with aiosqlite.connect(DB_PATH) as database:
            await database.execute(
                """
                INSERT INTO executions (
                    id,
                    workflow_id,
                    status,
                    started_at,
                    completed_at,
                    dag_json
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    execution_id,
                    workflow_id,
                    "running",
                    utc_timestamp(),
                    None,
                    json.dumps(dag_json),
                ),
            )
            await database.commit()
    except Exception as error:
        raise RuntimeError("Failed to create execution row") from error


async def update_execution_row_status(execution_id: str, status: str) -> None:
    completed_at = utc_timestamp() if status in {"completed", "failed"} else None
    try:
        async with aiosqlite.connect(DB_PATH) as database:
            await database.execute(
                """
                UPDATE executions
                SET status = ?, completed_at = ?
                WHERE id = ?
                """,
                (status, completed_at, execution_id),
            )
            await database.commit()
    except Exception as error:
        raise RuntimeError("Failed to update execution status") from error


async def record_not_approved_step(execution_id: str, step: ExecutorNode) -> None:
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
                    status = excluded.status,
                    completed_at = excluded.completed_at,
                    error_message = excluded.error_message
                """,
                (
                    f"{execution_id}-{step.id}",
                    execution_id,
                    step.id,
                    step.connector,
                    step.tool_name,
                    "failed",
                    None,
                    utc_timestamp(),
                    None,
                    json.dumps(step.input),
                    None,
                    0,
                    "Step was not approved",
                ),
            )
            await database.commit()
    except Exception as error:
        raise RuntimeError("Failed to write non-approved step state") from error


async def get_database_execution_status(
    execution_id: str,
) -> dict[str, Any] | None:
    try:
        async with aiosqlite.connect(DB_PATH) as database:
            database.row_factory = aiosqlite.Row
            cursor = await database.execute(
                """
                SELECT id, workflow_id, status, started_at, completed_at
                FROM executions
                WHERE id = ?
                """,
                (execution_id,),
            )
            row = await cursor.fetchone()

        if row is None:
            return None

        return {
            "execution_id": row["id"],
            "workflow_id": row["workflow_id"],
            "status": row["status"],
            "current_step": None,
            "pending_approval_steps": [],
            "error_message": None,
            "started_at": row["started_at"],
            "completed_at": row["completed_at"],
        }
    except Exception:
        return None