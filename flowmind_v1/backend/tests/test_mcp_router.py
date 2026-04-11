from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

from connector_library import ConnectorNotAuthenticatedError
from mcp_router import route_tool_call
from planner.planner_models import DAGNode


class MCPPouterTests(unittest.IsolatedAsyncioTestCase):
    async def test_route_tool_call_dispatches_to_jira(self) -> None:
        step = DAGNode(
            id="step_1",
            connector="jira",
            tool_name="create_issue",
            input={"fields": {"summary": "Test issue"}},
        )
        connector_mock = AsyncMock(
            return_value={
                "status": "ok",
                "connector": "jira",
                "tool_name": "create_issue",
                "data": {"issue_key": "FLOW-1"},
            }
        )

        with patch(
            "mcp_router.router_service.get_token",
            new=AsyncMock(return_value={"access_token": "token"}),
        ) as get_token_mock, patch.dict(
            "mcp_router.router_service.CONNECTOR_HANDLERS",
            {"jira": connector_mock},
            clear=False,
        ):
            result = await route_tool_call(step, "user_123")

        get_token_mock.assert_awaited_once_with("user_123", "jira")
        connector_mock.assert_awaited_once_with(step, {"access_token": "token"})
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["connector"], "jira")
        self.assertEqual(result["tool_name"], "create_issue")

    async def test_route_tool_call_raises_for_unsupported_connector(self) -> None:
        step = DAGNode(
            id="step_unsupported",
            connector="unknown_connector",
            tool_name="noop",
            input={},
        )

        with patch(
            "mcp_router.router_service.get_token",
            new=AsyncMock(return_value={"access_token": "token"}),
        ):
            with self.assertRaises(RuntimeError):
                await route_tool_call(step, "user_123")

    async def test_route_tool_call_propagates_not_authenticated_error(self) -> None:
        step = DAGNode(
            id="step_no_auth",
            connector="github",
            tool_name="open_pr",
            input={},
        )

        with patch(
            "mcp_router.router_service.get_token",
            new=AsyncMock(side_effect=ConnectorNotAuthenticatedError("github")),
        ):
            with self.assertRaises(ConnectorNotAuthenticatedError):
                await route_tool_call(step, "user_123")


if __name__ == "__main__":
    unittest.main()