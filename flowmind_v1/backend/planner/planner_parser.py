from __future__ import annotations

import json

from pydantic import ValidationError

from planner.planner_models import DAGPlannerResult


class ParseError(Exception):
    """Raised when planner output cannot be parsed into a DAGPlannerResult."""


def _strip_markdown_fences(raw_json: str) -> str:
    candidate = raw_json.strip()
    if not candidate.startswith("```"):
        return candidate

    lines = candidate.splitlines()
    if len(lines) >= 2 and lines[-1].strip() == "```":
        return "\n".join(lines[1:-1]).strip()

    return candidate.replace("```json", "").replace("```", "").strip()


def parse_llm_response(raw_json: str) -> DAGPlannerResult:
    normalized_payload = _strip_markdown_fences(raw_json)

    try:
        payload = json.loads(normalized_payload)
    except json.JSONDecodeError as error:
        raise ParseError(f"Invalid planner JSON: {error}") from error

    try:
        return DAGPlannerResult.model_validate(payload)
    except ValidationError as error:
        raise ParseError(f"Planner response validation failed: {error}") from error
