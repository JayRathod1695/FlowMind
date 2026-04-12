from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import aiosqlite

from config import DB_PATH, LOG_FILE_PATH
from log_service.log_stream import broadcast


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _log_file_path() -> Path:
    resolved = Path(LOG_FILE_PATH).expanduser()
    if resolved.is_absolute():
        return resolved
    return Path(__file__).resolve().parents[1] / resolved


def _append_json_line(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as log_file:
        log_file.write(json.dumps(payload, ensure_ascii=False) + "\n")


_FILE_WRITE_LOCK = asyncio.Lock()


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

        async with _FILE_WRITE_LOCK:
            await asyncio.to_thread(_append_json_line, _log_file_path(), log_entry)

        await broadcast(log_entry)
    except Exception:
        pass


async def drop_legacy_log_table() -> None:
    try:
        async with aiosqlite.connect(DB_PATH) as database:
            await database.executescript(
                """
                DROP INDEX IF EXISTS idx_log_entries_trace_id;
                DROP INDEX IF EXISTS idx_log_entries_execution_id;
                DROP INDEX IF EXISTS idx_log_entries_timestamp;
                DROP TABLE IF EXISTS log_entries;
                """
            )
            await database.commit()
    except Exception:
        pass