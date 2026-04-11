from __future__ import annotations

import asyncio
from typing import Any

from slack_sdk.web.client import WebClient

from planner.planner_models import DAGNode


def _build_slack_client(token: dict[str, Any]) -> WebClient:
    access_token = token.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise RuntimeError("Slack access_token is required")
    return WebClient(token=access_token)


def _chat_post_message(
    client: WebClient,
    channel: str,
    text: str | None = None,
    blocks: list[dict[str, Any]] | None = None,
) -> Any:
    return client.chat_postMessage(channel=channel, text=text, blocks=blocks)


async def send_message(client: WebClient, channel: str, text: str) -> str:
    response = await asyncio.to_thread(_chat_post_message, client, channel, text, None)
    return str(response["ts"])


async def notify_user(client: WebClient, user_id: str, text: str) -> str:
    return await send_message(client, user_id, text)


async def post_to_channel(
    client: WebClient,
    channel: str,
    blocks: list[dict[str, Any]],
) -> str:
    response = await asyncio.to_thread(_chat_post_message, client, channel, None, blocks)
    return str(response["ts"])


async def execute_tool(step: DAGNode, token: dict[str, Any]) -> dict[str, Any]:
    try:
        slack_client = _build_slack_client(token)
        tool_name = step.tool_name.strip().lower()

        if tool_name == "send_message":
            channel = step.input.get("channel")
            text = step.input.get("text")
            if not isinstance(channel, str) or not channel:
                raise RuntimeError("Slack send_message requires input.channel")
            if not isinstance(text, str) or not text:
                raise RuntimeError("Slack send_message requires input.text")
            timestamp = await send_message(slack_client, channel, text)
            data: dict[str, Any] = {"ts": timestamp}
        elif tool_name == "notify_user":
            user_id = step.input.get("user_id")
            text = step.input.get("text")
            if not isinstance(user_id, str) or not user_id:
                raise RuntimeError("Slack notify_user requires input.user_id")
            if not isinstance(text, str) or not text:
                raise RuntimeError("Slack notify_user requires input.text")
            timestamp = await notify_user(slack_client, user_id, text)
            data = {"ts": timestamp}
        elif tool_name == "post_to_channel":
            channel = step.input.get("channel")
            blocks = step.input.get("blocks")
            if not isinstance(channel, str) or not channel:
                raise RuntimeError("Slack post_to_channel requires input.channel")
            if not isinstance(blocks, list):
                raise RuntimeError("Slack post_to_channel requires list input.blocks")
            timestamp = await post_to_channel(slack_client, channel, blocks)
            data = {"ts": timestamp}
        else:
            raise RuntimeError(f"Unsupported Slack tool: {step.tool_name}")

        return {
            "status": "ok",
            "connector": "slack",
            "tool_name": step.tool_name,
            "data": data,
        }
    except Exception as error:
        raise RuntimeError(f"Slack connector failed: {error}") from error