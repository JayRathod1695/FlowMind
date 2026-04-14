"""SSE event stream manager for real-time execution updates."""
from __future__ import annotations

import asyncio
import json
from typing import Any


class ExecutionStream:
    """Async queue-backed SSE stream for a single execution."""

    def __init__(self, plan_id: str):
        self.plan_id = plan_id
        self.queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue(maxsize=500)
        self.done = False

    def push(self, event_type: str, data: dict[str, Any] | None = None) -> None:
        payload = {"type": event_type, **(data or {})}
        try:
            self.queue.put_nowait(payload)
        except asyncio.QueueFull:
            try:
                self.queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
            self.queue.put_nowait(payload)

    def push_token(self, token: str) -> None:
        self.push("llm_token", {"token": token})

    def push_step_start(self, step: int, server: str, icon: str, tool: str, args: dict) -> None:
        self.push("step_start", {
            "step": step, "server": server, "server_icon": icon,
            "tool": tool, "args": args,
        })

    def push_step_complete(self, step: int, result: str) -> None:
        self.push("step_complete", {"step": step, "result": result})

    def push_step_error(self, step: int, error: str) -> None:
        self.push("step_error", {"step": step, "error": error})

    def push_plan_generated(self, plan: dict[str, Any]) -> None:
        self.push("plan_generated", {"plan": plan})

    def finish(self, summary: str = "") -> None:
        self.push("execution_complete", {"summary": summary})
        self.done = True
        try:
            self.queue.put_nowait(None)  # sentinel
        except asyncio.QueueFull:
            pass

    def finish_error(self, error: str) -> None:
        self.push("execution_error", {"error": error})
        self.done = True
        try:
            self.queue.put_nowait(None)
        except asyncio.QueueFull:
            pass

    async def events(self):
        """Async generator yielding SSE-formatted strings."""
        while True:
            try:
                item = await asyncio.wait_for(self.queue.get(), timeout=30)
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
                continue

            if item is None:
                break

            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"


# Global registry of active streams
_streams: dict[str, ExecutionStream] = {}
_streams_lock = asyncio.Lock()


async def create_stream(plan_id: str) -> ExecutionStream:
    async with _streams_lock:
        stream = ExecutionStream(plan_id)
        _streams[plan_id] = stream
        return stream


async def get_stream(plan_id: str) -> ExecutionStream | None:
    async with _streams_lock:
        return _streams.get(plan_id)


async def remove_stream(plan_id: str) -> None:
    async with _streams_lock:
        _streams.pop(plan_id, None)
