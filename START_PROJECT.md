# FlowMind: Exact Startup Steps

This guide is for this workspace layout:

- `flowmind_v1/backend` (FastAPI)
- `flowmind_v1/frontend` (Vite + React)

## 1) Prerequisites

- Python 3.11+
- Node.js 18+
- npm (comes with Node)

## 2) Backend Setup (first time)

From the workspace root (`/Users/jayrathod/Desktop/flowmind`):

```bash
cd flowmind_v1/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Then edit `flowmind_v1/backend/.env` and set at least:

- `LLM_API_KEY` (required for planner calls)
- `TOKEN_ENCRYPTION_KEY` (required for storing connector tokens)

Generate an encryption key with:

```bash
cd flowmind_v1/backend
source .venv/bin/activate
python3.11 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Put that output into `TOKEN_ENCRYPTION_KEY=` in `.env`.

## 3) Run Backend

```bash
cd flowmind_v1/backend
source .venv/bin/activate
python3.11 scripts/run_migrations.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:

- Health: `http://localhost:8000/api/health`
- API base: `http://localhost:8000/api`

## 4) Frontend Setup (first time)

Open a second terminal, from workspace root:

```bash
cd flowmind_v1/frontend
npm install
```

## 5) Run Frontend

```bash
cd flowmind_v1/frontend
npm run dev
```

Frontend URL:

- App: `http://localhost:5173`

Notes:

- Vite is configured to proxy `/api` to `http://localhost:8000`, so keep backend running on port `8000`.
- If you change backend port, update `flowmind_v1/frontend/vite.config.ts`.

## 6) Quick Restart Commands (after first-time setup)

Terminal 1 (backend):

```bash
cd /Users/jayrathod/Desktop/flowmind/flowmind_v1/backend
source .venv/bin/activate
python scripts/run_migrations.py && uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 (frontend):

```bash
cd /Users/jayrathod/Desktop/flowmind/flowmind_v1/frontend
npm run dev
```

## 7) Optional: Backend Tests

```bash
cd flowmind_v1/backend
source .venv/bin/activate
python -m unittest discover -s tests
```