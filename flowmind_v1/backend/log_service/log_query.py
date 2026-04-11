from __future__ import annotations

import json
from typing import Any

import aiosqlite

from config import DB_PATH


def _decode_data(raw_data: str | None) -> dict[str, Any] | None:
    if raw_data is None:
        return None
    try:
        parsed = json.loads(raw_data)
        return parsed if isinstance(parsed, dict) else {"value": parsed}
    except json.JSONDecodeError:
        return {"value": raw_data}


async def query_logs(
    level: str | None = None,
    subsystem: str | None = None,
    from_time: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    try:
        where_clauses: list[str] = []
        parameters: list[Any] = []

        if level is not None:
            where_clauses.append("level = ?")
            parameters.append(level)
        if subsystem is not None:
            where_clauses.append("subsystem = ?")
            parameters.append(subsystem)
        if from_time is not None:
            where_clauses.append("timestamp >= ?")
            parameters.append(from_time)

        query = """
            SELECT
                id,
                trace_id,
                timestamp,
                level,
                subsystem,
                action,
                data,
                duration_ms,
                execution_id
            FROM log_entries
        """
        if where_clauses:
            query = f"{query} WHERE {' AND '.join(where_clauses)}"
        query = f"{query} ORDER BY timestamp DESC LIMIT ?"
        parameters.append(max(1, min(limit, 1000)))

        async with aiosqlite.connect(DB_PATH) as database:
            database.row_factory = aiosqlite.Row
            cursor = await database.execute(query, tuple(parameters))
            rows = await cursor.fetchall()

        return [
            {
                "id": row["id"],
                "trace_id": row["trace_id"],
                "timestamp": row["timestamp"],
                "level": row["level"],
                "subsystem": row["subsystem"],
                "action": row["action"],
                "data": _decode_data(row["data"]),
                "duration_ms": row["duration_ms"],
                "execution_id": row["execution_id"],
            }
            for row in rows
        ]
    except Exception:
        return []