from __future__ import annotations

from datetime import UTC, datetime, timedelta

import aiosqlite

from config import DB_PATH

STATE_TTL_MINUTES = 10


class OAuthStateInvalidError(RuntimeError):
    pass


def _utc_timestamp() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds")


def _parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


async def write_state(
    state: str,
    connector_name: str,
    user_id: str,
    code_verifier: str,
) -> None:
    try:
        async with aiosqlite.connect(DB_PATH) as database:
            await database.execute(
                """
                INSERT OR REPLACE INTO oauth_state_cache (
                    state,
                    connector_name,
                    user_id,
                    code_verifier,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    state,
                    connector_name,
                    user_id,
                    code_verifier,
                    _utc_timestamp(),
                ),
            )
            await database.commit()
    except Exception as error:
        raise RuntimeError("Failed to persist OAuth state") from error


async def validate_state(state: str) -> dict[str, str]:
    try:
        async with aiosqlite.connect(DB_PATH) as database:
            database.row_factory = aiosqlite.Row
            cursor = await database.execute(
                """
                SELECT state, connector_name, user_id, code_verifier, created_at
                FROM oauth_state_cache
                WHERE state = ?
                """,
                (state,),
            )
            row = await cursor.fetchone()
            await cursor.close()

            if row is None:
                raise OAuthStateInvalidError("OAuth state is missing")

            created_at = _parse_timestamp(str(row["created_at"]))
            expires_at = created_at + timedelta(minutes=STATE_TTL_MINUTES)
            if expires_at <= datetime.now(UTC):
                await database.execute(
                    "DELETE FROM oauth_state_cache WHERE state = ?",
                    (state,),
                )
                await database.commit()
                raise OAuthStateInvalidError("OAuth state has expired")

            await database.execute(
                "DELETE FROM oauth_state_cache WHERE state = ?",
                (state,),
            )
            await database.commit()

            return {
                "state": str(row["state"]),
                "connector_name": str(row["connector_name"]),
                "user_id": str(row["user_id"]),
                "code_verifier": str(row["code_verifier"]),
            }
    except OAuthStateInvalidError:
        raise
    except Exception as error:
        raise RuntimeError("Failed to validate OAuth state") from error


async def expire_old_states() -> None:
    cutoff = (datetime.now(UTC) - timedelta(minutes=STATE_TTL_MINUTES)).isoformat(
        timespec="milliseconds"
    )
    try:
        async with aiosqlite.connect(DB_PATH) as database:
            await database.execute(
                "DELETE FROM oauth_state_cache WHERE created_at < ?",
                (cutoff,),
            )
            await database.commit()
    except Exception as error:
        raise RuntimeError("Failed to expire OAuth states") from error
