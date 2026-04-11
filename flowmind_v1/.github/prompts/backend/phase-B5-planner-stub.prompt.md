agent: agent

# Phase B5 — LLM Planner (Stub + Integration Points)

Use @backend-agent for this phase.

## Goal
Build the complete planner module structure with a well-documented stub that is
ready for LLM SDK integration. The stub must return realistic hardcoded DAG output
so the rest of the system can be built without a live LLM.

## Deliverables

### `backend/planner/planner_models.py`:
Pydantic models: DAGNode, DAGEdge, ConfidenceScore, DAGPlannerResult, PlannerWarning

### `backend/planner/planner_prompts.py`:
DAG_GENERATION_PROMPT template string — no logic, just the prompt template.
Include {natural_language} and {available_connectors} as format placeholders.

### `backend/planner/planner_parser.py`:
```python
# parse_llm_response(raw_json: str) -> DAGPlannerResult
# 1. Strip markdown fences (```json ... ```)
# 2. json.loads()
# 3. Validate with DAGPlannerResult.model_validate()
# 4. Raise ParseError if invalid
```

### `backend/planner/planner_service.py`:
```python
# STUB — ready for LLM integration
# generate_dag(natural_language: str, available_connectors: list[str]) -> DAGPlannerResult
#
# === INTEGRATION POINT ===
# Install chosen LLM SDK. Add LLM_API_KEY, LLM_BASE_URL, LLM_MODEL to .env and config.py
# Replace the STUB BLOCK below with real LLM call:
#   response = await llm_client.chat.completions.create(...)
#   return await parse_llm_response(response.choices[0].message.content)
# Retry: exponential backoff 1s/2s/4s, max 3 attempts
# Raise LLMUnavailableError after 3 failures
# ========================
#
# STUB BLOCK (remove when integrating):
# Returns a hardcoded 3-step DAG for testing
```

### Wire to gateway/router_workflow.py:
Replace the workflow/generate stub with a real call to planner_service.generate_dag()

## ⚠️ MANUAL STEPS REQUIRED — NO SELF-TEST
The planner stub will return hardcoded data without an LLM key.
To fully integrate: fill LLM_API_KEY, LLM_BASE_URL, LLM_MODEL in your .env.
The stub (hardcoded DAG) can be manually verified:
```bash
curl -X POST http://localhost:8000/api/workflow/generate \
  -d '{"natural_language": "Create a Jira ticket and post to Slack", "available_connectors": ["jira", "slack"]}'
# Should return the hardcoded 3-node DAG from the stub
```