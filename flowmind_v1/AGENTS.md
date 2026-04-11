# FlowMind — Agentic MCP Gateway

## What This Project Is
FlowMind is a full-stack agentic application. Users type natural language workflow
descriptions. An LLM Planner converts them to a DAG. A DAG Executor runs the steps
in topological order, calling real external APIs (Jira, GitHub, Slack, Google Sheets)
via per-user OAuth tokens. A real-time log stream feeds the React frontend via SSE.

## Monorepo Layout
- `backend/` — Python 3.11 + FastAPI 0.115. Build this FIRST.
- `frontend/` — React 18 + Vite 5 + TypeScript. Build this SECOND.
- `.github/prompts/backend/` — Phased build prompts for backend
- `.github/prompts/frontend/` — Phased build prompts for frontend
- `.github/skills/` — Reference skill files for patterns and standards

## Absolute Rules (Apply Everywhere)
1. NO file exceeds 250 lines. Split into helpers if needed.
2. No hardcoded secrets. All from .env via config.py or constants.ts.
3. No print() in Python — use write_log(). No console.log in TS — use logger.ts.
4. Every I/O function has try/catch or try/except.
5. OAuth token values are NEVER logged. Only log user_id and connector_name.

## Build Order
Backend phases B1→B9, then Frontend phases F1→F9.
Use the phase prompt files in `.github/prompts/` to drive each phase.