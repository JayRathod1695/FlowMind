import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _env_any(*names: str, default: str = "") -> str:
    for name in names:
        value = _env(name)
        if value:
            return value
    return default


_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_TESTING_ROOT = Path(__file__).resolve().parent
_DEFAULT_PYTHON_BIN = str(_BACKEND_ROOT / ".venv" / "bin" / "python")
PYTHON_BIN = _env("FLOWMIND_PYTHON_BIN", _DEFAULT_PYTHON_BIN)
if not Path(PYTHON_BIN).exists():
    PYTHON_BIN = "python"

MCP_SERVERS = {

    "github": {
        "command": "github-mcp-server",
        "args": ["stdio"],
        "env": {
            "GITHUB_PERSONAL_ACCESS_TOKEN": _env("GITHUB_PERSONAL_ACCESS_TOKEN"),
        },
    },

    "slack": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-slack"],
        "env": {
            "SLACK_BOT_TOKEN": _env("SLACK_BOT_TOKEN"),
            "SLACK_TEAM_ID":   _env("SLACK_TEAM_ID"),
            "PATH":            _env("PATH"),
        },
    },

    "jira": {
        "command": "npx",
        "args": ["-y", "-p", "mcp-atlassian", "-p", "jsdom", "mcp-atlassian"],
        "env": {
            "ATLASSIAN_BASE_URL": _env_any("ATLASSIAN_BASE_URL", "JIRA_URL"),
            "ATLASSIAN_EMAIL":    _env_any("ATLASSIAN_EMAIL", "JIRA_EMAIL"),
            "ATLASSIAN_API_TOKEN": _env_any("ATLASSIAN_API_TOKEN", "JIRA_API_TOKEN"),
            "JIRA_URL":            _env("JIRA_URL"),
            "JIRA_USERNAME":       _env("JIRA_EMAIL"),
            "JIRA_API_TOKEN":      _env("JIRA_API_TOKEN"),
            "NODE_ENV":            "production",
            "LOG_LEVEL":           "error",
            "NO_COLOR":            "1",
            "FORCE_COLOR":         "0",
            "PATH":                _env("PATH"),
        },
    },

    "notion": {
        "command": "npx",
        "args": ["-y", "@notionhq/notion-mcp-server"],
        "env": {
            "OPENAPI_MCP_HEADERS": f'{{"Authorization": "Bearer {_env("NOTION_API_TOKEN")}", "Notion-Version": "2022-06-28"}}',
            "PATH": _env("PATH"),
        },
    },

    "postgres": {
        "command": "npx",
        "args": [
            "-y",
            "@modelcontextprotocol/server-postgres",
            _env("POSTGRES_CONNECTION_STRING"),
        ],
        "env": {
            "PATH": _env("PATH"),
        },
    },

    "linear": {
        "command": "npx",
        "args": ["-y", "linear-mcp-server"],
        "env": {
            "LINEAR_API_KEY": _env("LINEAR_API_KEY"),
            "PATH":           _env("PATH"),
        },
    },

    "gmail": {
        "command": PYTHON_BIN,
        "args": [str(_TESTING_ROOT / "gmail_mcp_server.py")],
        "env": {
            "GMAIL_CREDENTIALS_PATH": _env("GMAIL_CREDENTIALS_PATH", str(_BACKEND_ROOT / "gmail_credentials.json")),
            "GMAIL_TOKEN_PATH":       _env("GMAIL_TOKEN_PATH", str(_BACKEND_ROOT / "token.json")),
            "PATH":                   _env("PATH"),
        },
    },

    "filesystem": {
        "command": "npx",
        "args": [
            "-y",
            "@modelcontextprotocol/server-filesystem",
            _env("FILESYSTEM_PATH", "/Users/jayrathod/Desktop/flowmind"),
        ],
        "env": {
            "PATH": _env("PATH"),
        },
    },

    "duckduckgo": {
        "command": PYTHON_BIN,
        "args": [str(_TESTING_ROOT / "duckduckgo_mcp_server.py")],
        "env": {
            "PATH": _env("PATH"),
        },
    },

}
