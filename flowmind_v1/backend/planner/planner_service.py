from __future__ import annotations

from planner.planner_models import DAGPlannerResult
from planner.planner_nvidia_client import LLMUnavailableError, request_planner_completion
from planner.planner_parser import ParseError, parse_llm_response
from planner.planner_prompts import DAG_GENERATION_PROMPT


async def generate_dag(
    natural_language: str, available_connectors: list[str]
) -> DAGPlannerResult:
    if not available_connectors:
        raise ParseError("available_connectors must contain at least one connector")

    planner_prompt = DAG_GENERATION_PROMPT.format(
        natural_language=natural_language,
        available_connectors=", ".join(available_connectors),
    )
    completion_text = await request_planner_completion(planner_prompt)
    return parse_llm_response(completion_text)
