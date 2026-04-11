from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

import aiosqlite

from config import DB_PATH

SUPPORTED_CONNECTORS = ("jira", "github", "slack", "sheets")


class ConnectorNotAuthenticatedError(RuntimeError):
    def __init__(self, connector_name: str, user_id: str | None = None) -> None:
        message = f"Connector '{connector_name}' is not authenticated"
        if user_id:
            message = (
                f"Connector '{connector_name}' is not authenticated for user '{user_id}'"
            )
        super().__init__(message)
        self.connector_name = connector_name
        self.user_id = user_id


class ConnectorTokenExpiredError(RuntimeError):
    def __init__(self, connector_name: str, user_id: str) -> None:
        super().__init__(
            f"Connector token expired for '{connector_name}' and user '{user_id}'"
        )
        self.connector_name = connector_name
        self.user_id = user_id


@dataclass(slots=True)
class ConnectorConnection:
    connector_name: str
    status: str
    connected_account_label: str | None
    connected_at: str | None
    last_used_at: str | None
    error_message: str | None


def utc_timestamp() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds")


def normalize_connector_name(connector_name: str) -> str:
    normalized = connector_name.strip().lower()
    return "sheets" if normalized == "google" else normalized


def is_expired(token_expires_at: str | None) -> bool:
    if not token_expires_at:
        return False
    try:
        expires_at = datetime.fromisoformat(token_expires_at)
    except ValueError:
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    return expires_at <= datetime.now(UTC)


async def fetch_connection(user_id: str, connector_name: str) -> aiosqlite.Row | None:
    async with aiosqlite.connect(DB_PATH) as database:
        database.row_factory = aiosqlite.Row
        cursor = await database.execute(
            """
            SELECT
                encrypted_access_token,
                encrypted_refresh_token,
                token_expires_at,
                scopes,
                status
            FROM user_connections
            WHERE user_id = ? AND connector_name = ?
            """,
            (user_id, connector_name),
        )
        row = await cursor.fetchone()
        await cursor.close()
        return row


async def mark_connection_error(user_id: str, connector_name: str, error_message: str) -> None:
    async with aiosqlite.connect(DB_PATH) as database:
        await database.execute(
            """
            UPDATE user_connections
            SET status = 'error',
                error_message = ?,
                last_used_at = ?
            WHERE user_id = ? AND connector_name = ?
            """,
            (error_message, utc_timestamp(), user_id, connector_name),
        )
        await database.commit()


async def touch_last_used(user_id: str, connector_name: str) -> None:
    async with aiosqlite.connect(DB_PATH) as database:
        await database.execute(
            """
            UPDATE user_connections
            SET last_used_at = ?
            WHERE user_id = ? AND connector_name = ?
            """,
            (utc_timestamp(), user_id, connector_name),
        )
        await database.commit()


async def update_refreshed_tokens(
    user_id: str,
    connector_name: str,
    encrypted_access_token: str,
    encrypted_refresh_token: str,
    token_expires_at: str | None,
    scopes: str | None,
) -> None:
    async with aiosqlite.connect(DB_PATH) as database:
        await database.execute(
            """
            UPDATE user_connections
            SET status = 'connected',
                encrypted_access_token = ?,
                encrypted_refresh_token = ?,
                token_expires_at = ?,
                scopes = ?,
                error_message = NULL,
                last_used_at = ?
            WHERE user_id = ? AND connector_name = ?
            """,
            (
                encrypted_access_token,
                encrypted_refresh_token,
                token_expires_at,
                scopes,
                utc_timestamp(),
                user_id,
                connector_name,
            ),
        )
        await database.commit()


async def upsert_connection(
    user_id: str,
    connector_name: str,
    encrypted_access_token: str,
    encrypted_refresh_token: str | None,
    token_expires_at: str | None,
    scopes: str | None,
    account_label: str,
) -> None:
    timestamp = utc_timestamp()
    async with aiosqlite.connect(DB_PATH) as database:
        await database.execute(
            """
            INSERT INTO user_connections (
                id,
                user_id,
                connector_name,
                status,
                encrypted_access_token,
                encrypted_refresh_token,
                token_expires_at,
                scopes,
                connected_account_label,
                connected_at,
                last_used_at,
                error_message
            )
            VALUES (?, ?, ?, 'connected', ?, ?, ?, ?, ?, ?, ?, NULL)
            ON CONFLICT(user_id, connector_name)
            DO UPDATE SET
                status = 'connected',
                encrypted_access_token = excluded.encrypted_access_token,
                encrypted_refresh_token = excluded.encrypted_refresh_token,
                token_expires_at = excluded.token_expires_at,
                scopes = excluded.scopes,
                connected_account_label = excluded.connected_account_label,
                connected_at = excluded.connected_at,
                last_used_at = excluded.last_used_at,
                error_message = NULL
            """,
            (
                str(uuid.uuid4()),
                user_id,
                connector_name,
                encrypted_access_token,
                encrypted_refresh_token,
                token_expires_at,
                scopes,
                account_label,
                timestamp,
                timestamp,
            ),
        )
        await database.commit()


async def delete_connection(user_id: str, connector_name: str) -> str | None:
    async with aiosqlite.connect(DB_PATH) as database:
        database.row_factory = aiosqlite.Row
        cursor = await database.execute(
            """
            SELECT encrypted_access_token
            FROM user_connections
            WHERE user_id = ? AND connector_name = ?
            """,
            (user_id, connector_name),
        )
        row = await cursor.fetchone()
        await cursor.close()

        await database.execute(
            "DELETE FROM user_connections WHERE user_id = ? AND connector_name = ?",
            (user_id, connector_name),
        )
        await database.commit()

    if row is None:
        return None
    value = row["encrypted_access_token"]
    return str(value) if value else None


async def fetch_status_rows(user_id: str) -> list[aiosqlite.Row]:
    async with aiosqlite.connect(DB_PATH) as database:
        database.row_factory = aiosqlite.Row
        cursor = await database.execute(
            """
            SELECT
                connector_name,
                status,
                connected_account_label,
                connected_at,
                last_used_at,
                error_message
            FROM user_connections
            WHERE user_id = ?
            """,
            (user_id,),
        )
        rows = await cursor.fetchall()
        await cursor.close()
        return rows
