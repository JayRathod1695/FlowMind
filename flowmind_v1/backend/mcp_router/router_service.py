from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from connector_library import (
    ConnectorNotAuthenticatedError,
    ConnectorTokenExpiredError,
    get_token,
)
from log_service import write_log
from planner.planner_models import DAGNode

from . import connector_github, connector_jira, connector_sheets, connector_slack

ConnectorHandler = Callable[[DAGNode, dict[str, Any]], Awaitable[dict[str, Any]]]

CONNECTOR_HANDLERS: dict[str, ConnectorHandler] = {
    "jira": connector_jira.execute_tool,
    "github": connector_github.execute_tool,
    "slack": connector_slack.execute_tool,
    "sheets": connector_sheets.execute_tool,
}


def _normalize_response(
    connector_name: str, tool_name: str, response: dict[str, Any] | Any
) -> dict[str, Any]:
    if isinstance(response, dict):
        status = str(response.get("status", "ok"))
        data = response.get("data", response)
    else:
        status = "ok"
        data = response

    return {
        "status": status,
        "connector": connector_name,
        "tool_name": tool_name,
        "data": data,
    }


def _normalize_token_payload(token_result: Any) -> dict[str, Any]:
    if isinstance(token_result, str):
        return {"access_token": token_result}
    if isinstance(token_result, dict):
        return token_result
    raise RuntimeError("Connector token payload is invalid")


async def route_tool_call(step: DAGNode, user_id: str) -> dict[str, Any]:
    connector_name = step.connector.strip().lower()

    try:
        token_result = await get_token(user_id, connector_name)
        token = _normalize_token_payload(token_result)
        connector_handler = CONNECTOR_HANDLERS.get(connector_name)

        if connector_handler is None:
            raise RuntimeError(f"Unsupported connector: {connector_name}")

        raw_response = await connector_handler(step, token)
        normalized_response = _normalize_response(
            connector_name,
            step.tool_name,
            raw_response,
        )

        await write_log(
            "INFO",
            "mcp_router",
            "tool_call_routed",
            {
                "connector_name": connector_name,
                "tool_name": step.tool_name,
                "user_id": user_id,
            },
        )
        return normalized_response
    except ConnectorNotAuthenticatedError:
        await write_log(
            "WARN",
            "mcp_router",
            "connector_not_authenticated",
            {"connector_name": connector_name, "user_id": user_id},
        )
        raise
    except ConnectorTokenExpiredError:
        await write_log(
            "WARN",
            "mcp_router",
            "connector_token_expired",
            {"connector_name": connector_name, "user_id": user_id},
        )
        raise
    except RuntimeError:
        raise
    except Exception as error:
        await write_log(
            "ERROR",
            "mcp_router",
            "tool_call_failed",
            {
                "connector_name": connector_name,
                "tool_name": step.tool_name,
                "user_id": user_id,
                "error_type": type(error).__name__,
                "message": str(error),
            },
        )
        raise RuntimeError("MCP router failed to route tool call") from error