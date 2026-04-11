from __future__ import annotations

from dataclasses import dataclass, field

from config import (
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    SLACK_CLIENT_ID,
    SLACK_CLIENT_SECRET,
    SLACK_REDIRECT_URI,
)


class ConnectorConfigError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ConnectorConfig:
    connector_name: str
    client_id: str
    client_secret: str
    redirect_uri: str
    auth_url: str
    token_url: str
    revoke_url: str | None
    scopes: tuple[str, ...]
    auth_extra_params: dict[str, str] = field(default_factory=dict)


def _normalize_connector_name(connector_name: str) -> str:
    normalized = connector_name.strip().lower()
    return "sheets" if normalized == "google" else normalized


CONNECTOR_CONFIGS: dict[str, ConnectorConfig] = {
    "jira": ConnectorConfig(
        connector_name="jira",
        client_id=JIRA_CLIENT_ID,
        client_secret=JIRA_CLIENT_SECRET,
        redirect_uri=JIRA_REDIRECT_URI,
        auth_url="https://auth.atlassian.com/authorize",
        token_url="https://auth.atlassian.com/oauth/token",
        revoke_url="https://auth.atlassian.com/oauth/revoke",
        scopes=("offline_access", "read:jira-work", "write:jira-work"),
        auth_extra_params={
            "audience": "api.atlassian.com",
            "prompt": "consent",
        },
    ),
    "github": ConnectorConfig(
        connector_name="github",
        client_id=GITHUB_CLIENT_ID,
        client_secret=GITHUB_CLIENT_SECRET,
        redirect_uri=GITHUB_REDIRECT_URI,
        auth_url="https://github.com/login/oauth/authorize",
        token_url="https://github.com/login/oauth/access_token",
        revoke_url=None,
        scopes=("repo", "read:user"),
    ),
    "slack": ConnectorConfig(
        connector_name="slack",
        client_id=SLACK_CLIENT_ID,
        client_secret=SLACK_CLIENT_SECRET,
        redirect_uri=SLACK_REDIRECT_URI,
        auth_url="https://slack.com/oauth/v2/authorize",
        token_url="https://slack.com/api/oauth.v2.access",
        revoke_url="https://slack.com/api/auth.revoke",
        scopes=("chat:write", "users:read"),
    ),
    "sheets": ConnectorConfig(
        connector_name="sheets",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        redirect_uri=GOOGLE_REDIRECT_URI,
        auth_url="https://accounts.google.com/o/oauth2/v2/auth",
        token_url="https://oauth2.googleapis.com/token",
        revoke_url="https://oauth2.googleapis.com/revoke",
        scopes=(
            "openid",
            "email",
            "https://www.googleapis.com/auth/spreadsheets",
        ),
        auth_extra_params={
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
        },
    ),
}


def get_config(connector_name: str) -> ConnectorConfig:
    normalized = _normalize_connector_name(connector_name)
    config = CONNECTOR_CONFIGS.get(normalized)
    if config is None:
        raise ConnectorConfigError(f"Unsupported connector: {connector_name}")
    return config
