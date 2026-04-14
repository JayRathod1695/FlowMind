from __future__ import annotations

import os
from pathlib import Path
from typing import Final

from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parent
load_dotenv(_BACKEND_ROOT / ".env", override=True)


def _read_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _read_bool(name: str, default: bool = False) -> bool:
    value = _read_env(name, "true" if default else "false").lower()
    return value in {"1", "true", "yes", "on"}


def _read_int(name: str, default: int) -> int:
    raw = _read_env(name, str(default))
    try:
        return int(raw)
    except ValueError:
        return default


def _read_float(name: str, default: float) -> float:
    raw = _read_env(name, str(default))
    try:
        return float(raw)
    except ValueError:
        return default


def _read_csv(name: str, default: str) -> list[str]:
    raw_value = _read_env(name, default)
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _read_env_any(*names: str, default: str = "") -> str:
    for name in names:
        value = _read_env(name)
        if value:
            return value
    return default


CORS_ALLOWED_ORIGINS: Final[list[str]] = _read_csv(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
DEBUG: Final[bool] = _read_bool("DEBUG", False)

LOG_FILE_PATH: Final[str] = _read_env("LOG_FILE_PATH", "./flowmind.logs.jsonl")
LOG_TERMINAL_ENABLED: Final[bool] = _read_bool("LOG_TERMINAL_ENABLED", True)
LOG_TERMINAL_FORMAT: Final[str] = _read_env("LOG_TERMINAL_FORMAT", "message").lower()
LOG_TERMINAL_MIN_LEVEL: Final[str] = _read_env("LOG_TERMINAL_MIN_LEVEL", "INFO").upper()

LLM_API_KEY: Final[str] = _read_env_any("LLM_API_KEY", "NVIDIA_API_KEY")
LLM_BASE_URL: Final[str] = _read_env(
    "LLM_BASE_URL", "https://integrate.api.nvidia.com/v1"
)
LLM_MODEL: Final[str] = _read_env("LLM_MODEL", "nvidia/nemotron-3-super-120b-a12b")
LLM_TEMPERATURE: Final[float] = _read_float("LLM_TEMPERATURE", 1.0)
LLM_TOP_P: Final[float] = _read_float("LLM_TOP_P", 0.95)
LLM_MAX_TOKENS: Final[int] = _read_int("LLM_MAX_TOKENS", 16384)
LLM_REASONING_BUDGET: Final[int] = _read_int("LLM_REASONING_BUDGET", 16384)
LLM_ENABLE_THINKING: Final[bool] = _read_bool("LLM_ENABLE_THINKING", True)

_TESTING_ROOT = _BACKEND_ROOT / "Testing"
_DEFAULT_PYTHON_BIN = str(_BACKEND_ROOT / ".venv" / "bin" / "python")
MCP_PYTHON_BIN: Final[str] = _read_env("FLOWMIND_PYTHON_BIN", _DEFAULT_PYTHON_BIN)
if not Path(MCP_PYTHON_BIN).exists():
    MCP_PYTHON_BIN = "python"

MCP_SERVERS: Final[dict[str, dict[str, object]]] = {
    "github": {
        "command": "github-mcp-server",
        "args": ["stdio"],
        "env": {
            "GITHUB_PERSONAL_ACCESS_TOKEN": _read_env("GITHUB_PERSONAL_ACCESS_TOKEN"),
        },
    },
    "slack": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-slack"],
        "env": {
            "SLACK_BOT_TOKEN": _read_env("SLACK_BOT_TOKEN"),
            "SLACK_TEAM_ID": _read_env("SLACK_TEAM_ID"),
            "PATH": _read_env("PATH"),
        },
    },
    "jira": {
        "command": "npx",
        "args": ["-y", "-p", "mcp-atlassian", "-p", "jsdom", "mcp-atlassian"],
        "env": {
            "ATLASSIAN_BASE_URL": _read_env_any("ATLASSIAN_BASE_URL", "JIRA_URL"),
            "ATLASSIAN_EMAIL": _read_env_any("ATLASSIAN_EMAIL", "JIRA_EMAIL"),
            "ATLASSIAN_API_TOKEN": _read_env_any(
                "ATLASSIAN_API_TOKEN", "JIRA_API_TOKEN"
            ),
            "JIRA_URL": _read_env("JIRA_URL"),
            "JIRA_USERNAME": _read_env("JIRA_EMAIL"),
            "JIRA_API_TOKEN": _read_env("JIRA_API_TOKEN"),
            "NODE_ENV": "production",
            "LOG_LEVEL": "error",
            "NO_COLOR": "1",
            "FORCE_COLOR": "0",
            "PATH": _read_env("PATH"),
        },
    },
    "notion": {
        "command": "npx",
        "args": ["-y", "@notionhq/notion-mcp-server"],
        "env": {
            "OPENAPI_MCP_HEADERS": (
                '{"Authorization": "Bearer '
                + _read_env("NOTION_API_TOKEN")
                + '", "Notion-Version": "2022-06-28"}'
            ),
            "PATH": _read_env("PATH"),
        },
    },
    "postgres": {
        "command": "npx",
        "args": [
            "-y",
            "@modelcontextprotocol/server-postgres",
            _read_env("POSTGRES_CONNECTION_STRING"),
        ],
        "env": {
            "PATH": _read_env("PATH"),
        },
    },
    "linear": {
        "command": "npx",
        "args": ["-y", "linear-mcp-server"],
        "env": {
            "LINEAR_API_KEY": _read_env("LINEAR_API_KEY"),
            "PATH": _read_env("PATH"),
        },
    },
    "gmail": {
        "command": MCP_PYTHON_BIN,
        "args": [str(_TESTING_ROOT / "gmail_mcp_server.py")],
        "env": {
            "GMAIL_CREDENTIALS_PATH": _read_env(
                "GMAIL_CREDENTIALS_PATH", str(_BACKEND_ROOT / "gmail_credentials.json")
            ),
            "GMAIL_TOKEN_PATH": _read_env("GMAIL_TOKEN_PATH", str(_BACKEND_ROOT / "token.json")),
            "PATH": _read_env("PATH"),
        },
    },
    "filesystem": {
        "command": "npx",
        "args": [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            _read_env("FILESYSTEM_PATH", "/Users/jayrathod/Desktop/flowmind"),
        ],
        "env": {
            "PATH": _read_env("PATH"),
        },
    },
    "duckduckgo": {
        "command": MCP_PYTHON_BIN,
        "args": [str(_TESTING_ROOT / "duckduckgo_mcp_server.py")],
        "env": {
            "PATH": _read_env("PATH"),
        },
    },
}