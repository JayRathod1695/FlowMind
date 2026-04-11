from __future__ import annotations

import asyncio
from typing import Any

SubscriberQueue = asyncio.Queue[dict[str, Any]]
_subscribers: dict[str | None, set[SubscriberQueue]] = {}
_subscribers_lock = asyncio.Lock()


async def subscribe(execution_id: str | None) -> SubscriberQueue:
    subscriber_queue: SubscriberQueue = asyncio.Queue(maxsize=200)
    async with _subscribers_lock:
        _subscribers.setdefault(execution_id, set()).add(subscriber_queue)
    return subscriber_queue


async def unsubscribe(execution_id: str | None, queue: SubscriberQueue) -> None:
    async with _subscribers_lock:
        queues = _subscribers.get(execution_id)
        if queues is None:
            return
        queues.discard(queue)
        if not queues:
            _subscribers.pop(execution_id, None)


async def broadcast(entry: dict[str, Any]) -> None:
    entry_execution_id = entry.get("execution_id")
    subscriber_queues: list[SubscriberQueue] = []

    async with _subscribers_lock:
        subscriber_queues.extend(_subscribers.get(None, set()))
        if entry_execution_id is not None:
            subscriber_queues.extend(_subscribers.get(str(entry_execution_id), set()))

    for queue in subscriber_queues:
        if queue.full():
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
        try:
            queue.put_nowait(entry)
        except asyncio.QueueFull:
            continue