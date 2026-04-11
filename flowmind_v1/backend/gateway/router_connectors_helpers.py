from __future__ import annotations

import base64
import hashlib
import secrets
from urllib.parse import quote_plus

from connector_library import (
    get_status,
    revoke_token as revoke_connector_token,
    save_token,
)
from connector_library.connector_configs import ConnectorConfigError, get_config
from connector_library.library_service import serialize_connections
from connector_library.oauth_manager import build_auth_url, exchange_code
from connector_library.state_cache import (
    OAuthStateInvalidError,
    expire_old_states,
    validate_state,
    write_state,
)


class ConnectorOAuthNotConfiguredError(RuntimeError):
    pass


def normalize_connector_name(connector_name: str) -> str:
    normalized = connector_name.strip().lower()
    return "sheets" if normalized == "google" else normalized


def redirect_url(connector_name: str, connected: bool, error: str | None = None) -> str:
    if connected:
        return f"/connectors?connected={quote_plus(connector_name)}"
    if error:
        return (
            f"/connectors?error={quote_plus(error)}"
            f"&connector={quote_plus(connector_name)}"
        )
    return f"/connectors?error=oauth_failed&connector={quote_plus(connector_name)}"


def validate_connector(connector_name: str) -> str:
    normalized_connector = normalize_connector_name(connector_name)
    get_config(normalized_connector)
    return normalized_connector


def ensure_connector_configured(connector_name: str) -> None:
    config = get_config(connector_name)
    if not (config.client_id and config.client_secret and config.redirect_uri):
        raise ConnectorOAuthNotConfiguredError(
            f"OAuth configuration missing for connector '{connector_name}'"
        )


def _build_code_challenge(code_verifier: str) -> str:
    digest = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


async def create_auth_url(connector_name: str, user_id: str) -> str:
    ensure_connector_configured(connector_name)
    await expire_old_states()
    oauth_state = secrets.token_hex(32)
    code_verifier = secrets.token_urlsafe(64)
    await write_state(oauth_state, connector_name, user_id, code_verifier)
    code_challenge = _build_code_challenge(code_verifier)
    return build_auth_url(connector_name, oauth_state, code_challenge)


async def handle_callback(
    connector_name: str,
    state: str,
    code: str,
) -> None:
    state_payload = await validate_state(state)
    if normalize_connector_name(state_payload["connector_name"]) != connector_name:
        raise OAuthStateInvalidError("OAuth state connector mismatch")

    token_response = await exchange_code(
        connector_name,
        code,
        state_payload["code_verifier"],
    )
    account_label = token_response.account_label or connector_name.title()
    await save_token(
        state_payload["user_id"],
        connector_name,
        token_response,
        account_label,
    )


async def get_status_payload(user_id: str) -> list[dict[str, str | None]]:
    connections = await get_status(user_id)
    return serialize_connections(connections)


async def disconnect_user_connector(user_id: str, connector_name: str) -> None:
    await revoke_connector_token(user_id, connector_name)
