from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, StreamingResponse

from gateway.response_helpers import success_response
from log_service import query_logs, subscribe, unsubscribe, write_log

router = APIRouter()


async def _log_event_stream(execution_id: str | None) -> AsyncIterator[str]:
    subscriber_queue = await subscribe(execution_id)
    try:
        while True:
            try:
                entry = await asyncio.wait_for(subscriber_queue.get(), timeout=15)
                payload = (
                    entry
                    if isinstance(entry, dict) and "type" in entry
                    else {"type": "log", "entry": entry}
                )
                yield f"data: {json.dumps(payload)}\n\n"
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
    finally:
        await unsubscribe(execution_id, subscriber_queue)


@router.get("/api/logs/stream")
async def stream_logs(
    execution_id: str | None = Query(default=None),
) -> StreamingResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {
            "method": "GET",
            "path": "/api/logs/stream",
            "execution_id": execution_id,
        },
    )
    return StreamingResponse(
        _log_event_stream(execution_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.get("/api/logs/query")
async def query_logs_endpoint(
    level: str | None = Query(default=None),
    subsystem: str | None = Query(default=None),
    from_time: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
) -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "GET", "path": "/api/logs/query"},
    )
    entries = await query_logs(
        level=level,
        subsystem=subsystem,
        from_time=from_time,
        limit=limit,
    )
    return success_response(
        {"entries": entries, "total": len(entries), "filtered": len(entries)}
    )
