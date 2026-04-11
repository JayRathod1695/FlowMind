from __future__ import annotations

import asyncio
from typing import Any

from jira import JIRA

from planner.planner_models import DAGNode


def _build_jira_client(step: DAGNode, token: dict[str, Any]) -> JIRA:
    server = str(
        step.input.get("server")
        or token.get("server")
        or token.get("base_url")
        or ""
    ).strip()
    if not server:
        raise RuntimeError("Jira server URL is required")

    access_token = token.get("access_token")
    if isinstance(access_token, str) and access_token:
        return JIRA(server=server, token_auth=access_token)

    username = token.get("username") or token.get("email")
    api_token = token.get("api_token")
    if isinstance(username, str) and isinstance(api_token, str):
        if username and api_token:
            return JIRA(server=server, basic_auth=(username, api_token))

    raise RuntimeError("Jira credentials are missing from connector token data")


def create_issue(jira_client: JIRA, fields: dict[str, Any]) -> str:
    issue = jira_client.create_issue(fields=fields)
    return str(issue.key)


def get_issue(jira_client: JIRA, key: str) -> dict[str, Any]:
    issue = jira_client.issue(key)
    status_name = getattr(getattr(issue.fields, "status", None), "name", None)
    summary = getattr(issue.fields, "summary", None)
    return {"key": str(issue.key), "summary": summary, "status": status_name}


def update_status(jira_client: JIRA, key: str, transition_id: str) -> None:
    jira_client.transition_issue(key, transition_id)


async def execute_tool(step: DAGNode, token: dict[str, Any]) -> dict[str, Any]:
    try:
        jira_client = await asyncio.to_thread(_build_jira_client, step, token)
        tool_name = step.tool_name.strip().lower()

        if tool_name == "create_issue":
            fields = step.input.get("fields")
            if not isinstance(fields, dict):
                raise RuntimeError("Jira create_issue requires input.fields")
            issue_key = await asyncio.to_thread(create_issue, jira_client, fields)
            data: dict[str, Any] = {"issue_key": issue_key}
        elif tool_name == "get_issue":
            issue_key = step.input.get("key")
            if not isinstance(issue_key, str) or not issue_key:
                raise RuntimeError("Jira get_issue requires input.key")
            issue = await asyncio.to_thread(get_issue, jira_client, issue_key)
            data = {"issue": issue}
        elif tool_name == "update_status":
            issue_key = step.input.get("key")
            transition_id = step.input.get("transition_id")
            if not isinstance(issue_key, str) or not issue_key:
                raise RuntimeError("Jira update_status requires input.key")
            if not isinstance(transition_id, str) or not transition_id:
                raise RuntimeError("Jira update_status requires input.transition_id")
            await asyncio.to_thread(update_status, jira_client, issue_key, transition_id)
            data = {
                "updated": True,
                "key": issue_key,
                "transition_id": transition_id,
            }
        else:
            raise RuntimeError(f"Unsupported Jira tool: {step.tool_name}")

        return {
            "status": "ok",
            "connector": "jira",
            "tool_name": step.tool_name,
            "data": data,
        }
    except Exception as error:
        raise RuntimeError(f"Jira connector failed: {error}") from error