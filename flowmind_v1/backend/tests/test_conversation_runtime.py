from __future__ import annotations

import tempfile
from pathlib import Path
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch

import chat_store
import conversation_store
from executor import conversation_runtime


class ConversationRuntimeTests(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "flowmind.db"
        self._patchers = [
            patch.object(chat_store, "_DB_PATH", self.db_path),
            patch.object(conversation_store, "_DB_PATH", self.db_path),
        ]
        for patcher in self._patchers:
            patcher.start()

        chat_store.init_db()
        conversation_store.init_db()

    def tearDown(self) -> None:
        for patcher in reversed(self._patchers):
            patcher.stop()
        self.temp_dir.cleanup()

    async def test_start_conversation_stays_in_gathering_until_ready(self) -> None:
        with patch.object(
            conversation_runtime,
            "write_log",
            new=AsyncMock(return_value=None),
        ), patch.object(
            conversation_runtime,
            "gather_requirements",
            new=AsyncMock(
                return_value={
                    "assistant_message": "What system is affected, and what outcome do you want?",
                    "can_proceed": False,
                    "missing_info": ["system", "outcome"],
                    "requirement_summary": "User has a problem",
                    "planning_prompt": None,
                }
            ),
        ), patch.object(conversation_runtime, "plan_agent", new=AsyncMock()) as plan_agent_mock:
            result = await conversation_runtime.start_conversation("I have a problem")

        self.assertFalse(result["can_proceed"])
        self.assertIsNone(result["plan_id"])
        self.assertEqual(result["conversation"]["state"], "gathering")
        self.assertGreaterEqual(len(result["conversation"]["messages"]), 2)
        plan_agent_mock.assert_not_awaited()

    async def test_handle_turn_creates_plan_when_requirements_are_ready(self) -> None:
        dummy_plan = {
            "plan_id": "plan_123",
            "prompt": "User wants a Slack notification flow",
            "plan_summary": "Notify Slack when the event occurs",
            "steps": [],
            "step_count": 0,
            "failed_servers": [],
            "status": "pending",
        }

        session = conversation_store.create_conversation_session("Build me a Slack workflow")
        conversation_store.append_conversation_message(session["id"], "user", "Build me a Slack workflow")

        with patch.object(
            conversation_runtime,
            "write_log",
            new=AsyncMock(return_value=None),
        ), patch.object(
            conversation_runtime,
            "gather_requirements",
            new=AsyncMock(
                return_value={
                    "assistant_message": "I have enough detail. I’m creating the plan now.",
                    "can_proceed": True,
                    "missing_info": [],
                    "requirement_summary": "Build a Slack workflow",
                    "planning_prompt": "Build a Slack workflow that notifies the team when the event occurs.",
                }
            ),
        ), patch.object(
            conversation_runtime,
            "plan_agent",
            new=AsyncMock(return_value=dummy_plan),
        ):
            result = await conversation_runtime.handle_conversation_turn(session["id"])

        self.assertTrue(result["can_proceed"])
        self.assertEqual(result["plan_id"], "plan_123")
        self.assertEqual(result["conversation"]["state"], "planned")
        self.assertEqual(result["conversation"]["plan_id"], "plan_123")
        self.assertEqual(result["conversation"]["plan_json"]["plan_id"], "plan_123")
        self.assertGreaterEqual(len(result["conversation"]["messages"]), 3)


if __name__ == "__main__":
    import unittest

    unittest.main()