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
                CREATE TABLE IF NOT EXISTS conversation_sessions (
                    id TEXT PRIMARY KEY,
                    initial_prompt TEXT NOT NULL,
                    state TEXT NOT NULL DEFAULT 'gathering',
                    assistant_message TEXT,
                    plan_id TEXT,
                    plan_json TEXT,
                    result_json TEXT,
                    can_proceed INTEGER NOT NULL DEFAULT 0,
                    missing_info_json TEXT,
                    planning_prompt TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    completed_at TEXT
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS conversation_messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    turn_index INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata_json TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversation_sessions(id)
                )
                """
            )
            connection.commit()


def create_conversation_session(initial_prompt: str, session_id: str | None = None) -> dict[str, Any]:
    record_id = session_id or str(uuid.uuid4())[:8]
    now_iso = _utc_now_iso()

    with _DB_LOCK:
        with _get_connection() as connection:
            connection.execute(
                """
                INSERT INTO conversation_sessions (
                    id, initial_prompt, state, assistant_message, plan_id, plan_json,
                    result_json, can_proceed, missing_info_json, planning_prompt,
                    created_at, updated_at, completed_at
                ) VALUES (?, ?, 'gathering', NULL, NULL, NULL, NULL, 0, NULL, NULL, ?, ?, NULL)
                """,
                (record_id, initial_prompt, now_iso, now_iso),
            )
            connection.commit()

    session = get_conversation_session(record_id)
    if session is None:
        raise RuntimeError(f"Failed to persist conversation {record_id}")
    return session


def append_conversation_message(
    conversation_id: str,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    now_iso = _utc_now_iso()
    metadata_json = json.dumps(metadata, ensure_ascii=False) if metadata else None

    with _DB_LOCK:
        with _get_connection() as connection:
            row = connection.execute(
                "SELECT COALESCE(MAX(turn_index), 0) + 1 AS next_turn FROM conversation_messages WHERE conversation_id = ?",
                (conversation_id,),
            ).fetchone()
            turn_index = int(row["next_turn"] if row else 1)

            message_id = str(uuid.uuid4())[:8]
            connection.execute(
                """
                INSERT INTO conversation_messages (
                    id, conversation_id, turn_index, role, content, metadata_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (message_id, conversation_id, turn_index, role, content, metadata_json, now_iso),
            )
            connection.commit()

    return {
        "id": message_id,
        "conversation_id": conversation_id,
        "turn_index": turn_index,
        "role": role,
        "content": content,
        "metadata": metadata or {},
        "created_at": now_iso,
    }


def update_conversation_session(conversation_id: str, **fields: Any) -> dict[str, Any]:
    if not fields:
        session = get_conversation_session(conversation_id)
        if session is None:
            raise RuntimeError(f"Conversation {conversation_id} not found")
        return session

    allowed_fields = {
        "state",
        "assistant_message",
        "plan_id",
        "plan_json",
        "result_json",
        "can_proceed",
        "missing_info",
        "planning_prompt",
        "completed_at",
    }
    unknown_fields = sorted(set(fields) - allowed_fields)
    if unknown_fields:
        raise ValueError(f"Unsupported conversation fields: {', '.join(unknown_fields)}")

    updates: list[str] = []
    values: list[Any] = []
    now_iso = _utc_now_iso()

    for key, value in fields.items():
        if key == "missing_info":
            updates.append("missing_info_json = ?")
            values.append(json.dumps(value or [], ensure_ascii=False))
            continue

        if key in {"plan_json", "result_json"}:
            updates.append(f"{key} = ?")
            values.append(json.dumps(value, ensure_ascii=False) if value is not None else None)
            continue

        if key == "can_proceed":
            updates.append("can_proceed = ?")
            values.append(1 if value else 0)
            continue

        updates.append(f"{key} = ?")
        values.append(value)

    updates.append("updated_at = ?")
    values.append(now_iso)

    if fields.get("state") == "completed" and "completed_at" not in fields:
        updates.append("completed_at = ?")
        values.append(now_iso)

    values.append(conversation_id)

    with _DB_LOCK:
        with _get_connection() as connection:
            connection.execute(
                f"UPDATE conversation_sessions SET {', '.join(updates)} WHERE id = ?",
                values,
            )
            connection.commit()

    session = get_conversation_session(conversation_id)
    if session is None:
        raise RuntimeError(f"Conversation {conversation_id} not found")
    return session


def get_conversation_session(conversation_id: str) -> dict[str, Any] | None:
    with _DB_LOCK:
        with _get_connection() as connection:
            session_row = connection.execute(
                """
                SELECT id, initial_prompt, state, assistant_message, plan_id, plan_json,
                       result_json, can_proceed, missing_info_json, planning_prompt,
                       created_at, updated_at, completed_at
                FROM conversation_sessions
                WHERE id = ?
                """,
                (conversation_id,),
            ).fetchone()
            if session_row is None:
                return None

            message_rows = connection.execute(
                """
                SELECT id, conversation_id, turn_index, role, content, metadata_json, created_at
                FROM conversation_messages
                WHERE conversation_id = ?
                ORDER BY turn_index ASC, datetime(created_at) ASC
                """,
                (conversation_id,),
            ).fetchall()

    session = dict(session_row)
    session["plan_json"] = json.loads(session["plan_json"]) if session["plan_json"] else None
    session["result_json"] = json.loads(session["result_json"]) if session["result_json"] else None
    session["missing_info"] = json.loads(session["missing_info_json"]) if session["missing_info_json"] else []
    session.pop("missing_info_json", None)
    session["messages"] = []

    for row in message_rows:
        message = dict(row)
        metadata_json = message.pop("metadata_json", None)
        message["metadata"] = json.loads(metadata_json) if metadata_json else {}
        session["messages"].append(message)

    return session