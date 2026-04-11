from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

from log_service import write_log

ResultType = TypeVar("ResultType")


async def with_retry(
    coro_factory: Callable[[], Awaitable[ResultType]],
    max_attempts: int = 3,
    base_delay: float = 1.0,
) -> ResultType:
    if max_attempts < 1:
        raise ValueError("max_attempts must be at least 1")

    last_error: Exception | None = None

    for attempt_number in range(1, max_attempts + 1):
        try:
            return await coro_factory()
        except Exception as error:
            last_error = error
            if attempt_number >= max_attempts:
                break

            delay_seconds = base_delay * (2 ** (attempt_number - 1))
            await write_log(
                "WARN",
                "executor",
                "retry_triggered",
                {
                    "attempt_number": attempt_number,
                    "max_attempts": max_attempts,
                    "delay_seconds": delay_seconds,
                    "error_type": type(error).__name__,
                    "message": str(error),
                },
            )
            await asyncio.sleep(delay_seconds)

    if last_error is None:
        raise RuntimeError("Retry loop ended without a result or error")

    raise last_error