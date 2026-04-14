from __future__ import annotations

import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config import (
    LOG_FILE_PATH,
    LOG_TERMINAL_ENABLED,
    LOG_TERMINAL_FORMAT,
    LOG_TERMINAL_MIN_LEVEL,
)
from log_service.log_stream import broadcast


_LEVEL_ORDER = {
    "DEBUG": 10,
    "INFO": 20,
    "WARN": 30,
    "WARNING": 30,
    "ERROR": 40,
}


def _should_print_terminal(level: str) -> bool:
    threshold = _LEVEL_ORDER.get(LOG_TERMINAL_MIN_LEVEL, _LEVEL_ORDER["INFO"])
    current = _LEVEL_ORDER.get(level.upper(), _LEVEL_ORDER["INFO"])
    return current >= threshold


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


def _print_terminal_log(payload: dict[str, Any]) -> None:
    if not LOG_TERMINAL_ENABLED:
        return

    level = str(payload.get("level") or "INFO")
    if not _should_print_terminal(level):
        return

    if LOG_TERMINAL_FORMAT == "message":
        timestamp = str(payload.get("timestamp") or "")
        subsystem = str(payload.get("subsystem") or "gateway")
        action = str(payload.get("action") or "event")
        print(
            f"[{timestamp}] {level} {subsystem} {action}",
            file=sys.stdout,
            flush=True,
        )
        return

    print(json.dumps(payload, ensure_ascii=False), file=sys.stdout, flush=True)


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

        _print_terminal_log(log_entry)
        await broadcast(log_entry)
    except Exception:
        pass