# FlowMind

FlowMind is a full-stack agentic MCP gateway. You describe a task in natural language, FlowMind plans the work, executes tool calls across MCP servers, and streams progress back to a modern React UI.

This repository has a historical top-level scaffold, but the active application is in:

- `flowmind_v1/backend`
- `flowmind_v1/frontend`

This README documents the current working architecture and development workflow end to end.

## Table Of Contents

- [What FlowMind Does](#what-flowmind-does)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [How The Product Flow Works](#how-the-product-flow-works)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [Data, Storage, And Logs](#data-storage-and-logs)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Current Limitations](#current-limitations)

## What FlowMind Does

FlowMind supports three major interaction modes:

1. **Conversation-first planning**
   - The assistant gathers missing requirements first.
   - Once enough context is available, it generates a plan.
   - You review and execute that plan.

2. **Quick run mode**
   - A single API call runs plan + execute immediately.

3. **Deferred webhook mode**
   - Prompts like "when a PR opens..." are queued.
   - Webhook events resume execution automatically.

Supported MCP integrations in the current backend config:

- GitHub
- Slack
- Jira (Atlassian)
- Notion
- PostgreSQL
- Linear
- Gmail (local MCP runner)
- Filesystem
- DuckDuckGo (local MCP runner)

## Architecture

High-level execution path:

```text
React Frontend (Vite)
	-> FastAPI Gateway
		-> Conversation Runtime (gather requirements)
		-> Agent Runtime (plan + execute)
			-> MCP Runtime Loader
				-> MCP Servers (GitHub/Slack/Jira/Notion/...)
					-> External APIs

Execution events and logs stream back via SSE to the frontend.
```

Runtime behavior highlights:

- MCP servers are pre-initialized at backend startup.
- Runtime status exposes tool count and failed server list.
- Plans are stored in-memory for approval/execution.
- Chats and conversations are persisted in SQLite.

## Repository Structure

```text
flowmind/
	README.md
	START_PROJECT.md
	flowmind_v1/
		AGENTS.md
		backend/
			main.py
			config.py
			chat_store.py
			conversation_store.py
			gateway/
			executor/
			mcp_client/
			log_service/
			tests/
			Testing/
		frontend/
			src/
			package.json
			vite.config.ts
		design-system/
```

Notes:

- `flowmind_v1/backend/Testing` contains standalone prototype/reference scripts.
- `flowmind_v1/design-system` contains product/design documentation.

## Tech Stack

Backend:

- Python 3.11
- FastAPI + Uvicorn
- OpenAI SDK (against configurable LLM endpoint)
- MCP Python SDK (`mcp`)
- SQLite (local persistence)

Frontend:

- React 19 + TypeScript
- Vite
- Tailwind CSS v4 + shadcn/ui primitives
- React Router

## Prerequisites

- Python 3.11+
- Node.js 18+ (Node is needed for both frontend and MCP servers started with `npx`)
- npm
- API credentials for LLM + the connectors you want to use

## Quick Start

### 1) Backend Setup

```bash
cd flowmind_v1/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Then edit `flowmind_v1/backend/.env`.

Minimum required values to run agent planning/execution:

- `LLM_API_KEY` (or `NVIDIA_API_KEY`)
- `LLM_BASE_URL`
- `LLM_MODEL`

### 2) Start Backend

```bash
cd flowmind_v1/backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:

- API root: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/health`

Important: migrations are not required in the current backend. Tables are created automatically at startup.

### 3) Frontend Setup

```bash
cd flowmind_v1/frontend
npm install
```

### 4) Start Frontend

```bash
cd flowmind_v1/frontend
npm run dev
```

Frontend URL:

- `http://localhost:5173`

The frontend calls the backend directly using `VITE_API_BASE_URL` (default: `http://<current-host>:8000`).

## Environment Variables

All backend env vars are documented in `flowmind_v1/backend/.env.example`.

### Core Runtime

- `CORS_ALLOWED_ORIGINS`
- `DEBUG`
- `LOG_FILE_PATH`
- `LOG_TERMINAL_ENABLED`
- `LOG_TERMINAL_FORMAT` (`json` or `message`)
- `LOG_TERMINAL_MIN_LEVEL`

### LLM Configuration

- `LLM_API_KEY` or `NVIDIA_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `LLM_TEMPERATURE`
- `LLM_TOP_P`
- `LLM_MAX_TOKENS`
- `LLM_ENABLE_THINKING`
- `LLM_REASONING_BUDGET`

### MCP Integration Variables

- GitHub: `GITHUB_PERSONAL_ACCESS_TOKEN`
- Slack: `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID`
- Jira/Atlassian: `ATLASSIAN_BASE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN` (or `JIRA_*` aliases)
- Notion: `NOTION_API_TOKEN`
- Postgres: `POSTGRES_CONNECTION_STRING`
- Linear: `LINEAR_API_KEY`
- Filesystem: `FILESYSTEM_PATH`
- Gmail local runner: `GMAIL_CREDENTIALS_PATH`, `GMAIL_TOKEN_PATH`

### Frontend

- `VITE_API_BASE_URL` (optional)

### About OAuth Variables In `.env.example`

Some OAuth variables are still present in `.env.example` for legacy compatibility, but the active runtime path uses MCP server credentials/tooling directly.

## How The Product Flow Works

### Conversation-first flow (default UI path)

1. Frontend starts a conversation: `POST /api/conversations/start`
2. Backend gathers missing requirements.
3. Once ready, backend generates a plan and stores it.
4. Frontend opens the plan page for review.
5. User executes the plan: `POST /api/agent/execute/{plan_id}`
6. Step events stream via SSE: `GET /api/agent/execute/{plan_id}/stream`

### Quick run flow

- `POST /api/agent/run` performs plan + execute in one call.

### Deferred webhook flow

- If prompt intent is event-driven (for example "when a PR opens"), task is queued.
- Webhooks resume task when matching event arrives.

## API Reference

All responses follow a common envelope:

```json
{
  "success": true,
  "data": {}
}
```

On errors:

```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "..." }
}
```

### Agent And Planning

- `POST /api/agent/run` - quick plan + execute
- `POST /api/agent/plan` - generate plan only
- `POST /api/agent/execute/{plan_id}` - execute an existing plan
- `GET /api/agent/execute/{plan_id}/stream` - SSE execution stream
- `GET /api/agent/plans` - list in-memory plans
- `GET /api/agent/plan/{plan_id}` - fetch a plan
- `GET /api/agent/runtime` - runtime status
- `POST /api/agent/runtime/shutdown` - shutdown runtime

### Conversations

- `POST /api/conversations/start`
- `POST /api/conversations/{conversation_id}/message`
- `POST /api/conversations/{conversation_id}/turn`
- `GET /api/conversations/{conversation_id}`

### Chat History And Hook Summaries

- `GET /api/chats`
- `GET /api/chats/{chat_id}`
- `GET /api/chats/waiting`
- `GET /api/chats/hooks`

### Logs

- `GET /api/logs/query`
- `GET /api/logs/stream` (SSE)
- `POST /api/logs` (frontend log ingestion)

### Health

- `GET /api/health`

### Webhooks

- `POST /webhooks/github`
- `POST /webhooks/slack`
- `GET /webhooks/health`

If `GITHUB_WEBHOOK_SECRET` is set, GitHub signatures are verified.

## Frontend Routes

- `/` - Landing page
- `/login` - UI login screen (currently simulated)
- `/signup` - UI signup screen (currently simulated)
- `/app` - Conversation workspace
- `/app/plan/:planId` - Plan review + execution stream
- `/app/history` - Stored chat history and payload inspection
- `/app/hooks` - Active/inactive webhook task dashboard
- `/app/status` - Runtime/health/log metrics

## Data, Storage, And Logs

Backend local files:

- SQLite DB: `flowmind_v1/backend/flowmind.db`
- JSONL logs: `flowmind_v1/backend/flowmind.logs.jsonl`

SQLite tables currently used:

- `chats`
- `conversation_sessions`
- `conversation_messages`

Runtime state currently kept in-memory:

- pending plans
- deferred webhook queue
- loaded MCP sessions/tool router

## Testing

### Backend

From `flowmind_v1/backend`:

```bash
source .venv/bin/activate
python -m unittest tests.test_conversation_runtime tests.test_hooks_summary
```

Known status at time of this update:

- `tests.test_conversation_runtime` passes
- `tests.test_hooks_summary` passes
- `python -m unittest discover -s tests` currently fails because `tests/test_mcp_router.py` imports legacy modules (`connector_library`) that are not part of the active architecture

### Frontend

From `flowmind_v1/frontend`:

```bash
npm run typecheck
npm run build
```

## Troubleshooting

### Runtime shows zero tools or failed servers

- Check `GET /api/agent/runtime` and `GET /api/health`.
- Verify connector env vars are present.
- Ensure required executables are available:
  - `npx` for MCP servers launched through npm packages
  - `github-mcp-server` binary for GitHub server config

### `AGENT_NOT_CONFIGURED` response

- Set `LLM_API_KEY` (or `NVIDIA_API_KEY`) in backend `.env`.
- Restart backend after env changes.

### Gmail MCP tool failures

- Confirm `GMAIL_CREDENTIALS_PATH` points to a valid Google OAuth client JSON.
- First run may require interactive consent and token creation.

### Webhook tasks never resume

- Confirm webhook endpoint receives events.
- For GitHub, ensure `X-Hub-Signature-256` matches `GITHUB_WEBHOOK_SECRET` if enabled.
- Check `/webhooks/health` and `/api/chats/hooks`.

## Current Limitations

- Auth pages are UI-only (no real backend auth/session yet).
- Runtime queues and plan cache are in-memory and reset on backend restart.
- SQLite storage is local and single-node by default.
- Some legacy files/docs/tests remain in the repo but are not part of the active path.

---

If you are extending FlowMind, follow coding and repository conventions in `flowmind_v1/AGENTS.md`.
