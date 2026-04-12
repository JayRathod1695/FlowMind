from pathlib import Path

import os

from dotenv import load_dotenv
from mcp import ClientSession

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


GITHUB_TOKEN = _env("GITHUB_PERSONAL_ACCESS_TOKEN")
SLACK_BOT_TOKEN = _env("SLACK_BOT_TOKEN")
SLACK_TEAM_ID = _env("SLACK_TEAM_ID")


def mcp_to_openai_tools(mcp_tools, prefix=""):
    """Convert MCP tools to OpenAI format. prefix helps distinguish github vs slack tools."""
    return [
        {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema,
            },
        }
        for tool in mcp_tools
    ]


async def run_tool(session: ClientSession, tool_name: str, tool_args: dict) -> str:
    result = await session.call_tool(tool_name, tool_args)
    if result.content:
        return result.content[0].text
    return "Tool executed successfully with no output."