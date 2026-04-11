from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = PROJECT_ROOT / "migrations"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config import DB_PATH


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _list_migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"), key=lambda path: path.name)


async def _ensure_schema_migrations_table(database: aiosqlite.Connection) -> None:
    await database.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
        """
    )
    await database.commit()


async def _get_applied_migrations(database: aiosqlite.Connection) -> set[str]:
    cursor = await database.execute("SELECT name FROM schema_migrations")
    rows = await cursor.fetchall()
    await cursor.close()
    return {row[0] for row in rows}


async def apply_migrations() -> None:
    try:
        async with aiosqlite.connect(DB_PATH) as database:
            await _ensure_schema_migrations_table(database)
            applied_migrations = await _get_applied_migrations(database)

            for migration_file in _list_migration_files():
                migration_name = migration_file.name

                if migration_name in applied_migrations:
                    print(f"Already applied: {migration_name}")
                    continue

                sql_script = migration_file.read_text(encoding="utf-8")
                await database.executescript(sql_script)
                await database.execute(
                    "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)",
                    (migration_name, _utc_timestamp()),
                )
                await database.commit()
                print(f"Applied: {migration_name}")
    except Exception as error:
        raise RuntimeError("Failed to apply migrations") from error


if __name__ == "__main__":
    asyncio.run(apply_migrations())
