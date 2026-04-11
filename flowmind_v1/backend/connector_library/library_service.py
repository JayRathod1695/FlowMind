from __future__ import annotations

from dataclasses import asdict

from connector_library.connector_configs import get_config
from connector_library.library_service_helpers import (
    SUPPORTED_CONNECTORS,
    ConnectorConnection,
    ConnectorNotAuthenticatedError,
    ConnectorTokenExpiredError,
    delete_connection,
    fetch_connection,
    fetch_status_rows,
    is_expired,
    mark_connection_error,
    normalize_connector_name,
    touch_last_used,
    update_refreshed_tokens,
    upsert_connection,
)
from connector_library.oauth_manager import (
    OAuthExchangeError,
    TokenResponse,
    refresh_token,
    revoke_token as revoke_oauth_token,
)
from connector_library.token_encryption import decrypt, encrypt
from log_service import write_log


async def get_token(user_id: str, connector_name: str) -> str:
    normalized_connector = normalize_connector_name(connector_name)
    try:
        get_config(normalized_connector)
        row = await fetch_connection(user_id, normalized_connector)
        if row is None:
            raise ConnectorNotAuthenticatedError(normalized_connector, user_id)

        encrypted_access_token = row["encrypted_access_token"]
        encrypted_refresh_token = row["encrypted_refresh_token"]
        token_expires_at = str(row["token_expires_at"]) if row["token_expires_at"] else None
        scopes = str(row["scopes"]) if row["scopes"] else None
        status = str(row["status"] or "")

        if status != "connected" or not encrypted_access_token:
            raise ConnectorNotAuthenticatedError(normalized_connector, user_id)

        if is_expired(token_expires_at):
            if not encrypted_refresh_token:
                await mark_connection_error(user_id, normalized_connector, "Refresh token missing")
                raise ConnectorTokenExpiredError(normalized_connector, user_id)

            decrypted_refresh_token = decrypt(str(encrypted_refresh_token))
            try:
                refreshed = await refresh_token(normalized_connector, decrypted_refresh_token)
            except OAuthExchangeError as error:
                await mark_connection_error(user_id, normalized_connector, str(error))
                raise ConnectorTokenExpiredError(normalized_connector, user_id) from error

            await update_refreshed_tokens(
                user_id,
                normalized_connector,
                encrypt(refreshed.access_token),
                encrypt(refreshed.refresh_token or decrypted_refresh_token),
                refreshed.expires_at,
                refreshed.scopes or scopes,
            )
            return refreshed.access_token

        access_token = decrypt(str(encrypted_access_token))
        await touch_last_used(user_id, normalized_connector)
        return access_token
    except (ConnectorNotAuthenticatedError, ConnectorTokenExpiredError):
        raise
    except Exception as error:
        raise RuntimeError("Failed to resolve connector token") from error


async def save_token(
    user_id: str,
    connector_name: str,
    token_response: TokenResponse,
    account_label: str,
) -> None:
    normalized_connector = normalize_connector_name(connector_name)
    try:
        get_config(normalized_connector)
        encrypted_refresh_token = (
            encrypt(token_response.refresh_token) if token_response.refresh_token else None
        )
        await upsert_connection(
            user_id,
            normalized_connector,
            encrypt(token_response.access_token),
            encrypted_refresh_token,
            token_response.expires_at,
            token_response.scopes,
            account_label,
        )
        await write_log(
            "INFO",
            "connector_library",
            "oauth_flow_completed",
            {
                "connector_name": normalized_connector,
                "user_id": user_id,
                "account_label": account_label,
            },
        )
    except Exception as error:
        raise RuntimeError("Failed to save connector token") from error


async def revoke_token(user_id: str, connector_name: str) -> None:
    normalized_connector = normalize_connector_name(connector_name)
    try:
        encrypted_access_token = await delete_connection(user_id, normalized_connector)
        if encrypted_access_token:
            await revoke_oauth_token(normalized_connector, decrypt(encrypted_access_token))
        await write_log(
            "INFO",
            "connector_library",
            "connector_disconnected",
            {"connector_name": normalized_connector, "user_id": user_id},
        )
    except Exception as error:
        raise RuntimeError("Failed to revoke connector token") from error


async def get_status(user_id: str) -> list[ConnectorConnection]:
    status_map = {
        name: ConnectorConnection(name, "disconnected", None, None, None, None)
        for name in SUPPORTED_CONNECTORS
    }
    try:
        rows = await fetch_status_rows(user_id)
        for row in rows:
            connector_name = normalize_connector_name(str(row["connector_name"]))
            if connector_name in status_map:
                status_map[connector_name] = ConnectorConnection(
                    connector_name=connector_name,
                    status=str(row["status"]),
                    connected_account_label=row["connected_account_label"],
                    connected_at=row["connected_at"],
                    last_used_at=row["last_used_at"],
                    error_message=row["error_message"],
                )
        return [status_map[name] for name in SUPPORTED_CONNECTORS]
    except Exception as error:
        raise RuntimeError("Failed to retrieve connector status") from error


def serialize_connections(connections: list[ConnectorConnection]) -> list[dict[str, str | None]]:
    return [asdict(connection) for connection in connections]
