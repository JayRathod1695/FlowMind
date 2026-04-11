from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import aiosqlite

from config import DB_PATH


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    """Yield an async SQLite connection configured with row access by column."""
    connection: aiosqlite.Connection | None = None
    try:
        connection = await aiosqlite.connect(DB_PATH)
        connection.row_factory = aiosqlite.Row
        yield connection
    except Exception as error:
        raise RuntimeError("Failed to open database connection") from error
    finally:
        if connection is not None:
            await connection.close()
