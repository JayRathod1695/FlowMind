from __future__ import annotations

import json
from unittest import IsolatedAsyncioTestCase

from gateway import router_agent
from gateway.webhook_queue import DeferredTask, TaskStatus, task_queue


class HooksSummaryTests(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.original_tasks = task_queue._tasks
        task_queue._tasks = {}

    def tearDown(self) -> None:
        task_queue._tasks = self.original_tasks

    def _make_task(self, prompt: str, webhook_type: str, status: TaskStatus) -> DeferredTask:
        task = task_queue.create_task(prompt, webhook_type, {"action": "opened"})
        task.status = status
        return task

    async def test_hooks_summary_groups_tasks_by_activity(self) -> None:
        waiting = self._make_task("Wait for GitHub issue", "github", TaskStatus.WAITING)
        resumed = self._make_task("Resume Slack task", "slack", TaskStatus.RESUMED)
        resumed.event_data = {"channel": "#general"}
        done = self._make_task("Completed webhook", "github", TaskStatus.DONE)
        done.event_data = {"result": "ok"}
        failed = self._make_task("Failed webhook", "slack", TaskStatus.FAILED)
        failed.event_data = {"error": "timeout"}

        summary = router_agent.build_hooks_summary(task_queue.get_tasks())

        self.assertEqual(summary["summary"]["total"], 4)
        self.assertEqual(summary["summary"]["active_count"], 2)
        self.assertEqual(summary["summary"]["inactive_count"], 2)
        self.assertEqual(summary["summary"]["breakdown"]["waiting"], 1)
        self.assertEqual(summary["summary"]["breakdown"]["resumed"], 1)
        self.assertEqual(summary["summary"]["breakdown"]["done"], 1)
        self.assertEqual(summary["summary"]["breakdown"]["failed"], 1)

        self.assertEqual({item["status"] for item in summary["active"]}, {"waiting", "resumed"})
        self.assertEqual({item["status"] for item in summary["inactive"]}, {"done", "failed"})
        self.assertIn("event_data", waiting.to_dict())
        self.assertIsNone(waiting.to_dict()["event_data"])

        response = await router_agent.get_hooks_summary_route()
        payload = json.loads(response.body.decode())

        self.assertTrue(payload["success"])
        self.assertEqual(payload["data"]["summary"]["total"], 4)
        self.assertEqual(len(payload["data"]["active"]), 2)
        self.assertEqual(len(payload["data"]["inactive"]), 2)


if __name__ == "__main__":
    import unittest

    unittest.main()