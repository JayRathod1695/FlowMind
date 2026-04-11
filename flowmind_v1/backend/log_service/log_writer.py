from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import aiosqlite

from config import DB_PATH
from log_service.log_stream import broadcast


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


async def write_log(
    level: str,
    subsystem: str,
    action: str,
    data: dict[str, Any] | None = None,
    duration_ms: int | None = None,
    trace_id: str | None = None,
    execution_id: str | None = None,
) -> None:
    try:
        log_entry = {
            "id": str(uuid.uuid4()),
            "trace_id": trace_id,
            "timestamp": _utc_timestamp(),
            "level": level,
            "subsystem": subsystem,
            "action": action,
            "data": data,
            "duration_ms": duration_ms,
            "execution_id": execution_id,
        }
        serialized_data = json.dumps(data) if data is not None else None

        async with aiosqlite.connect(DB_PATH) as database:
            await database.execute(
                """
                INSERT INTO log_entries (
                    id,
                    trace_id,
                    timestamp,
                    level,
                    subsystem,
                    action,
                    data,
                    duration_ms,
                    execution_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    log_entry["id"],
                    log_entry["trace_id"],
                    log_entry["timestamp"],
                    log_entry["level"],
                    log_entry["subsystem"],
                    log_entry["action"],
                    serialized_data,
                    log_entry["duration_ms"],
                    log_entry["execution_id"],
                ),
            )
            await database.commit()

        await broadcast(log_entry)
    except Exception:
        pass