# FlowMind

FlowMind is a full-stack agentic MCP gateway. Users describe workflows in natural language, the planner converts them into a DAG, the executor runs each step against external services, and the app streams logs back to the UI in real time.

## Repository Layout

- `backend/` - FastAPI application, planner, executor, connector handlers, migrations, and tests.
- `frontend/` - Vite + TypeScript frontend scaffold.
- `flowmind.db` - Local SQLite database created by the migration scripts.

## Requirements

- Python 3.11+
- Node.js 18+ if you plan to work on the frontend
- API credentials for the services you want to connect, such as Jira, GitHub, Slack, Google, and your LLM provider

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` with your real values before starting the app.

## Environment Variables

The backend reads configuration from environment variables loaded through `backend/config.py`. The main values are documented in `backend/.env.example` and include:

- `DB_PATH`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `TOKEN_ENCRYPTION_KEY`
- `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `JIRA_REDIRECT_URI`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

## Run The Backend

Run migrations first, then start the API:

```bash
cd backend
source .venv/bin/activate
python scripts/run_migrations.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

## Tests

The existing backend tests use Python's built-in `unittest` runner:

```bash
cd backend
source .venv/bin/activate
python -m unittest discover -s tests
```

## Notes

- Keep secrets out of git.
- The backend is designed to work with OAuth-based connectors and a local SQLite database.
- If you extend the project, keep the repository rules in `AGENTS.md` in mind.