import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


BACKEND_DIR = Path(__file__).resolve().parents[1]
VENV_PYTHON = str(BACKEND_DIR / ".venv" / "bin" / "python")
VENV_DDG_SERVER = str(BACKEND_DIR / ".venv" / "bin" / "duckduckgo-mcp-server")
GMAIL_RUNNER = str(Path(__file__).resolve().parent / "mcp_gmail_runner.py")

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
        "args": [
            "-y",
            "--package=mcp-atlassian",
            "--package=jsdom",
            "mcp-atlassian",
        ],
        "env": {
            "ATLASSIAN_BASE_URL": _env("ATLASSIAN_BASE_URL") or _env("JIRA_URL"),
            "ATLASSIAN_EMAIL":    _env("ATLASSIAN_EMAIL") or _env("JIRA_EMAIL"),
            "ATLASSIAN_API_TOKEN": _env("ATLASSIAN_API_TOKEN") or _env("JIRA_API_TOKEN"),
            "PATH":               _env("PATH"),
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
        "command": VENV_PYTHON,
        "args": [GMAIL_RUNNER],
        "env": {
            "GMAIL_CREDENTIALS_PATH": _env("GMAIL_CREDENTIALS_PATH"),
            "GMAIL_TOKEN_PATH":       _env("GMAIL_TOKEN_PATH"),
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
        "command": VENV_DDG_SERVER,
        "args": ["--transport", "stdio"],
        "env": {
            "PATH": _env("PATH"),
        },
    },

}
