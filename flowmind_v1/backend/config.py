from __future__ import annotations

import os
from typing import Final

from dotenv import load_dotenv

load_dotenv()


def _read_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _read_bool(name: str, default: bool = False) -> bool:
    value = _read_env(name, "true" if default else "false").lower()
    return value in {"1", "true", "yes", "on"}


def _read_csv(name: str, default: str) -> list[str]:
    raw_value = _read_env(name, default)
    return [item.strip() for item in raw_value.split(",") if item.strip()]


CORS_ALLOWED_ORIGINS: Final[list[str]] = _read_csv(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173"
)
DEBUG: Final[bool] = _read_bool("DEBUG", False)

DB_PATH: Final[str] = _read_env("DB_PATH", "./flowmind.db")

LLM_API_KEY: Final[str] = _read_env("LLM_API_KEY")
LLM_BASE_URL: Final[str] = _read_env(
    "LLM_BASE_URL", "https://integrate.api.nvidia.com/v1"
)
LLM_MODEL: Final[str] = _read_env("LLM_MODEL", "qwen/qwen3.5-122b-a10b")

TOKEN_ENCRYPTION_KEY: Final[str] = _read_env("TOKEN_ENCRYPTION_KEY")

JIRA_CLIENT_ID: Final[str] = _read_env("JIRA_CLIENT_ID")
JIRA_CLIENT_SECRET: Final[str] = _read_env("JIRA_CLIENT_SECRET")
JIRA_REDIRECT_URI: Final[str] = _read_env(
    "JIRA_REDIRECT_URI", "http://localhost:8000/api/connectors/jira/callback"
)

GITHUB_CLIENT_ID: Final[str] = _read_env("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET: Final[str] = _read_env("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI: Final[str] = _read_env(
    "GITHUB_REDIRECT_URI", "http://localhost:8000/api/connectors/github/callback"
)

SLACK_CLIENT_ID: Final[str] = _read_env("SLACK_CLIENT_ID")
SLACK_CLIENT_SECRET: Final[str] = _read_env("SLACK_CLIENT_SECRET")
SLACK_REDIRECT_URI: Final[str] = _read_env(
    "SLACK_REDIRECT_URI", "http://localhost:8000/api/connectors/slack/callback"
)

GOOGLE_CLIENT_ID: Final[str] = _read_env("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET: Final[str] = _read_env("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI: Final[str] = _read_env(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/connectors/google/callback"
)