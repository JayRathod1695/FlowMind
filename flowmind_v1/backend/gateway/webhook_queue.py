from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class TaskStatus(Enum):
    WAITING = "waiting"
    RESUMED = "resumed"
    DONE = "done"
    FAILED = "failed"


@dataclass
class DeferredTask:
    task_id: str
    user_prompt: str
    status: TaskStatus
    webhook_type: str
    webhook_filter: dict
    created_at: datetime = field(default_factory=datetime.now)
    event_data: Optional[dict] = None
    resume_event: asyncio.Event = field(default_factory=asyncio.Event)

    def to_dict(self, *, include_event_data: bool = True) -> dict[str, Any]:
        payload = {
            "id": self.task_id,
            "prompt": self.user_prompt,
            "status": self.status.value,
            "webhook_type": self.webhook_type,
            "webhook_filter": self.webhook_filter,
            "created_at": self.created_at.isoformat(),
        }
        if include_event_data:
            payload["event_data"] = self.event_data
        return payload


class TaskQueue:
    def __init__(self):
        self._tasks: dict[str, DeferredTask] = {}

    def get_tasks(self, status: TaskStatus | None = None) -> list[DeferredTask]:
        tasks = list(self._tasks.values())
        if status is None:
            return tasks

        return [task for task in tasks if task.status == status]

    def create_task(
        self,
        user_prompt: str,
        webhook_type: str,
        webhook_filter: dict,
    ) -> DeferredTask:
        task_id = str(uuid.uuid4())[:8]
        task = DeferredTask(
            task_id=task_id,
            user_prompt=user_prompt,
            status=TaskStatus.WAITING,
            webhook_type=webhook_type,
            webhook_filter=webhook_filter,
        )
        self._tasks[task_id] = task
        print(f"\nTask [{task_id}] registered - waiting for {webhook_type} event")
        return task

    def resume_task(self, webhook_type: str, event_data: dict) -> Optional[DeferredTask]:
        for task in self._tasks.values():
            if task.status == TaskStatus.WAITING and task.webhook_type == webhook_type:
                if self._matches(task.webhook_filter, event_data):
                    task.event_data = event_data
                    task.status = TaskStatus.RESUMED
                    task.resume_event.set()
                    print(f"\nTask [{task.task_id}] resumed by {webhook_type} event")
                    return task
        return None

    def get_waiting_tasks(self) -> list[DeferredTask]:
        return self.get_tasks(TaskStatus.WAITING)

    def _matches(self, webhook_filter: dict, event_data: dict) -> bool:
        for key, expected in webhook_filter.items():
            actual = event_data.get(key)
            if isinstance(expected, str) and isinstance(actual, str):
                if actual.lower() != expected.lower():
                    return False
                continue
            if actual != expected:
                return False
        return True


task_queue = TaskQueue()