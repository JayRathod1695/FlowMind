from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_DB_PATH = Path(__file__).resolve().parent / "flowmind.db"
_DB_LOCK = threading.Lock()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with _DB_LOCK:
        with _get_connection() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS chats (
                    id TEXT PRIMARY KEY,
                    prompt TEXT NOT NULL,
                    plan_id TEXT,
                    plan_json TEXT,
                    result_json TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TEXT NOT NULL,
                    completed_at TEXT
                )
                """
            )
            connection.commit()


def save_chat(
    prompt: str,
    plan: dict[str, Any] | None,
    result: dict[str, Any] | None,
    status: str,
    chat_id: str | None = None,
    plan_id: str | None = None,
) -> dict[str, Any]:
    """Create or update a chat record.

    If chat_id already exists, this updates plan/result/status in place.
    """
    record_id = chat_id or (plan_id if plan_id else str(uuid.uuid4())[:8])
    now_iso = _utc_now_iso()
    completed_at = now_iso if status in {"completed", "failed"} else None
    plan_json = json.dumps(plan, ensure_ascii=False) if plan is not None else None
    result_json = json.dumps(result, ensure_ascii=False) if result is not None else None

    with _DB_LOCK:
        with _get_connection() as connection:
            existing = connection.execute(
                "SELECT id, prompt, created_at FROM chats WHERE id = ?",
                (record_id,),
            ).fetchone()

            if existing is None:
                connection.execute(
                    """
                    INSERT INTO chats (id, prompt, plan_id, plan_json, result_json, status, created_at, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record_id,
                        prompt,
                        plan_id or record_id,
                        plan_json,
                        result_json,
                        status,
                        now_iso,
                        completed_at,
                    ),
                )
            else:
                connection.execute(
                    """
                    UPDATE chats
                    SET
                        prompt = ?,
                        plan_id = ?,
                        plan_json = COALESCE(?, plan_json),
                        result_json = COALESCE(?, result_json),
                        status = ?,
                        completed_at = CASE
                            WHEN ? IS NOT NULL THEN ?
                            ELSE completed_at
                        END
                    WHERE id = ?
                    """,
                    (
                        prompt or existing["prompt"],
                        plan_id or record_id,
                        plan_json,
                        result_json,
                        status,
                        completed_at,
                        completed_at,
                        record_id,
                    ),
                )

            connection.commit()

    chat = get_chat(record_id)
    if chat is None:
        raise RuntimeError(f"Failed to persist chat {record_id}")
    return chat


def get_chats(limit: int = 50) -> list[dict[str, Any]]:
    safe_limit = max(1, min(limit, 500))
    with _DB_LOCK:
        with _get_connection() as connection:
            rows = connection.execute(
                """
                SELECT id, prompt, plan_id, status, created_at, completed_at
                FROM chats
                ORDER BY datetime(created_at) DESC
                LIMIT ?
                """,
                (safe_limit,),
            ).fetchall()

    return [dict(row) for row in rows]


def get_chat(chat_id: str) -> dict[str, Any] | None:
    with _DB_LOCK:
        with _get_connection() as connection:
            row = connection.execute(
                """
                SELECT id, prompt, plan_id, plan_json, result_json, status, created_at, completed_at
                FROM chats
                WHERE id = ?
                """,
                (chat_id,),
            ).fetchone()

    if row is None:
        return None

    record = dict(row)
    plan_json = record.get("plan_json")
    result_json = record.get("result_json")
    record["plan_json"] = json.loads(plan_json) if isinstance(plan_json, str) and plan_json else None
    record["result_json"] = json.loads(result_json) if isinstance(result_json, str) and result_json else None
    return record
