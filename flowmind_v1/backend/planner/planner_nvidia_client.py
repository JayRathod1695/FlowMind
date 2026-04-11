from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from log_service import write_log


class LLMUnavailableError(Exception):
    """Raised when the planner cannot reach the LLM provider after retries."""


_REQUEST_TIMEOUT_SECONDS = 60.0
_MAX_ATTEMPTS = 3
_BACKOFF_SECONDS = (1, 2, 4)


def _chat_completions_url() -> str:
    return f"{LLM_BASE_URL.rstrip('/')}/chat/completions"


def _extract_text_from_delta(delta_payload: dict[str, Any]) -> tuple[str, str]:
    thinking_text = ""
    answer_text = ""

    reasoning_value = (
        delta_payload.get("reasoning_content")
        or delta_payload.get("reasoning")
        or delta_payload.get("thinking")
    )
    if isinstance(reasoning_value, str):
        thinking_text = reasoning_value
    elif isinstance(reasoning_value, list):
        thinking_text = "".join(
            item.get("text", "")
            for item in reasoning_value
            if isinstance(item, dict)
            and isinstance(item.get("text"), str)
        )

    content_value = delta_payload.get("content")
    if isinstance(content_value, str):
        answer_text = content_value
    elif isinstance(content_value, list):
        answer_text = "".join(
            item.get("text", "")
            for item in content_value
            if isinstance(item, dict)
            and isinstance(item.get("text"), str)
        )

    return thinking_text, answer_text


def _extract_choice_delta_text(chunk_payload: dict[str, Any]) -> tuple[str, str]:
    choices = chunk_payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return "", ""

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        return "", ""

    delta_payload = first_choice.get("delta")
    if isinstance(delta_payload, dict):
        return _extract_text_from_delta(delta_payload)

    message_payload = first_choice.get("message")
    if isinstance(message_payload, dict):
        message_content = message_payload.get("content")
        if isinstance(message_content, str):
            return "", message_content
        if isinstance(message_content, list):
            text_value = "".join(
                item.get("text", "")
                for item in message_content
                if isinstance(item, dict)
                and isinstance(item.get("text"), str)
            )
            return "", text_value

    return "", ""


async def _log_stream_chunk(
    action: str,
    chunk_text: str,
    attempt: int,
) -> None:
    if not chunk_text.strip():
        return

    await write_log(
        "DEBUG",
        "planner",
        action,
        {
            "attempt": attempt,
            "chunk": chunk_text,
        },
    )


async def request_planner_completion(prompt: str) -> str:
    if not LLM_API_KEY:
        raise LLMUnavailableError("LLM_API_KEY is not configured")

    request_headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
    }
    request_payload = {
        "model": LLM_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 16384,
        "temperature": 0.60,
        "top_p": 0.95,
        "stream": True,
        "chat_template_kwargs": {"enable_thinking": True},
    }

    last_error: Exception | None = None

    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                await write_log(
                    "DEBUG",
                    "planner",
                    "planner_stream_started",
                    {
                        "attempt": attempt,
                        "model": LLM_MODEL,
                    },
                )

                answer_parts: list[str] = []

                async with client.stream(
                    "POST",
                    _chat_completions_url(),
                    headers=request_headers,
                    json=request_payload,
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if not line.startswith("data:"):
                            continue

                        chunk_data = line[5:].strip()
                        if not chunk_data:
                            continue
                        if chunk_data == "[DONE]":
                            break

                        chunk_payload = json.loads(chunk_data)
                        thinking_text, answer_text = _extract_choice_delta_text(chunk_payload)

                        await _log_stream_chunk(
                            "planner_stream_thinking",
                            thinking_text,
                            attempt,
                        )
                        await _log_stream_chunk(
                            "planner_stream_output",
                            answer_text,
                            attempt,
                        )

                        if answer_text:
                            answer_parts.append(answer_text)

                combined_answer = "".join(answer_parts).strip()
                if not combined_answer:
                    raise LLMUnavailableError("LLM stream completed without output text")

                await write_log(
                    "DEBUG",
                    "planner",
                    "planner_stream_completed",
                    {
                        "attempt": attempt,
                        "output_chars": len(combined_answer),
                    },
                )

                return combined_answer
            except (
                httpx.RequestError,
                httpx.HTTPStatusError,
                json.JSONDecodeError,
                ValueError,
                LLMUnavailableError,
            ) as error:
                last_error = error
                await write_log(
                    "WARN",
                    "planner",
                    "planner_stream_retry",
                    {
                        "attempt": attempt,
                        "error_type": type(error).__name__,
                        "message": str(error),
                    },
                )
                if attempt == _MAX_ATTEMPTS:
                    break

                wait_seconds = _BACKOFF_SECONDS[min(attempt - 1, len(_BACKOFF_SECONDS) - 1)]
                await asyncio.sleep(wait_seconds)

    raise LLMUnavailableError(
        f"Failed to reach LLM provider after {_MAX_ATTEMPTS} attempts: {last_error}"
    ) from last_error
