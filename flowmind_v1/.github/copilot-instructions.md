# FlowMind — GitHub Copilot Instructions

## Project Summary
Full-stack agentic workflow app. Backend: Python 3.11 + FastAPI in `backend/`.
Frontend: React 18 + Vite + TypeScript in `frontend/`. One monorepo, one .github folder.

## Tech Stack
### Backend
- Framework: FastAPI 0.115 + uvicorn (no Docker — run directly with virtualenv)
- DB: aiosqlite (SQLite) — logs, workflows, executions, OAuth tokens
- Vector DB: chromadb 0.5.5 (in-memory, BYO embeddings)
- Auth: Fernet encryption (cryptography 42.x) for OAuth token storage
- Real connectors: jira 3.8, PyGithub 2.x, slack-sdk 3.x, gspread 6.x
- HTTP client: httpx 0.27.2
- Validation: pydantic 2.8.2

### Frontend
- Build: React 18.3.1 + Vite 5.4.0 + TypeScript 5.5.3
- Styling: Tailwind CSS 3.4.7 + shadcn/ui
- State: Zustand 4.5.4 (4 stores: workflow, execution, log, connector)
- DAG viz: @xyflow/react 12.x + @dagrejs/dagre
- Charts: echarts-for-react (real-time latency), recharts (sparklines)
- Log list: @tanstack/react-virtual (virtualized)
- Routing: react-router-dom 6.26.0

## Critical Coding Rules
- Max 250 lines per file. Split large files into ComponentName.helpers.ts
- All Python async functions properly awaited
- All Pydantic models used for API inputs/outputs
- All React components memoized if receiving frequent SSE updates
- Consistent response envelope: { success, data, error: { code, message } }
- Error codes are UPPER_SNAKE_CASE constants defined in one place
- Variable names: full words only (execution_id NOT exec_id)

## Folder Reference
- Backend subsystems: gateway/, planner/, executor/, mcp_router/, connector_library/
- Frontend stores: src/store/ | hooks: src/hooks/ | services: src/services/
- Types: src/types/ (workflow, execution, log, connector type files)
- Pages: HomePage, DAGPage, ExecutionPage, StatusPage, ConnectorsPage

## What to NEVER Do
- Never store user OAuth tokens in .env (only app CLIENT_ID/SECRET go there)
- Never pass token values to any log function
- Never return raw stack traces to the client — always { success: false, error: {...} }
- Never use React Context for real-time streaming data (use Zustand)
- Never run health checks on-demand — always read from cached background results