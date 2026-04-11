agent: agent

# Phase B1 — Backend Project Setup

Use @backend-agent for this phase.

## Goal
Scaffold the complete `backend/` folder structure with all directories, a working
FastAPI app skeleton, virtualenv setup files, and .env.example.

## Deliverables

### 1. Create this exact folder structure inside `backend/`:
backend/
├── main.py
├── requirements.txt
├── .env.example
├── config.py
├── gateway/
│   ├── init.py
│   ├── router_workflow.py    (stub — returns 501 Not Implemented)
│   ├── router_execution.py   (stub)
│   ├── router_logs.py        (stub)
│   ├── router_health.py      (stub — returns { status: "ok" })
│   ├── router_connectors.py  (stub)
│   ├── middleware.py
│   └── models.py             (empty Pydantic models file)
├── planner/   (init.py only)
├── executor/  (init.py only)
├── mcp_router/ (init.py only)
├── connector_library/ (init.py only)
├── migrations/ (empty folder)
└── scripts/
└── run_migrations.py  (stub — prints "No migrations yet")

### 2. main.py requirements:
- Import FastAPI, include all 5 routers
- Add CORS middleware reading from config.py
- Add startup log message via print() (ONLY in main.py startup — nowhere else)
- Lifespan context manager for startup/shutdown

### 3. requirements.txt — exact versions from Report 2:
fastapi==0.115.0, uvicorn[standard]==0.30.6, python-dotenv==1.0.1,
pydantic==2.8.2, httpx==0.27.2, aiosqlite==0.20.0, anyio==4.4.0,
chromadb==0.5.5, cryptography>=42.0.0, jira==3.8.0, PyGithub>=2.0,
slack-sdk>=3.0, gspread>=6.0, google-auth

### 4. .env.example — all variables from Report 2 Section 12

### 5. config.py — reads all .env vars, exposes typed constants

## Self-Test ✅
After building, run:
```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000
curl http://localhost:8000/api/health
```
Expected: `{"success": true, "data": {"status": "ok"}}` — no 500 errors.