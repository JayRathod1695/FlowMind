from __future__ import annotations

from planner.planner_models import DAGPlannerResult


class LLMUnavailableError(Exception):
    """Raised when the planner cannot reach the LLM provider after retries."""


async def generate_dag(
    natural_language: str, available_connectors: list[str]
) -> DAGPlannerResult:
    # STUB — ready for LLM integration
    # generate_dag(natural_language: str, available_connectors: list[str])
    # -> DAGPlannerResult
    #
    # === INTEGRATION POINT ===
    # Install chosen LLM SDK. Add LLM_API_KEY, LLM_BASE_URL, LLM_MODEL to .env
    # and config.py.
    # Replace the STUB BLOCK below with real LLM call:
    #   response = await llm_client.chat.completions.create(...)
    #   return parse_llm_response(response.choices[0].message.content)
    # Retry strategy: exponential backoff 1s/2s/4s, max 3 attempts.
    # Raise LLMUnavailableError after 3 failures.
    # ========================
    #
    # STUB BLOCK (remove when integrating):
    # Returns a hardcoded 3-step DAG for testing.
    primary_connector = available_connectors[0]
    secondary_connector = (
        available_connectors[1]
        if len(available_connectors) > 1
        else available_connectors[0]
    )

    return DAGPlannerResult.model_validate(
        {
            "nodes": [
                {
                    "id": "step-1",
                    "connector": primary_connector,
                    "tool_name": "create_item",
                    "input": {"prompt": natural_language},
                },
                {
                    "id": "step-2",
                    "connector": secondary_connector,
                    "tool_name": "enrich_item",
                    "input": {"source_step_id": "step-1"},
                },
                {
                    "id": "step-3",
                    "connector": secondary_connector,
                    "tool_name": "notify_completion",
                    "input": {"source_step_id": "step-2"},
                },
            ],
            "edges": [
                {"from": "step-1", "to": "step-2"},
                {"from": "step-2", "to": "step-3"},
            ],
            "confidence": {
                "overall": 0.84,
                "rationale": "Stub planner output with coherent dependencies.",
            },
            "warnings": [
                {
                    "code": "STUB_PLANNER",
                    "message": "Planner is running in stub mode without LLM.",
                }
            ],
        }
    )
