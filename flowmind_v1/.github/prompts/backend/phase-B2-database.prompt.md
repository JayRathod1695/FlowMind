agent: agent

# Phase B2 — Database & Migrations

Use @backend-agent for this phase.

## Goal
Create all 6 SQL migration files and a working migration runner. Create the
aiosqlite database connection module used by all subsystems.

## Deliverables

### 1. Migration files in `backend/migrations/`:
Create exactly these files with the schemas from `.github/instructions/database.instructions.md`:
- 001_create_log_entries.sql
- 002_create_workflows.sql
- 003_create_executions.sql
- 004_create_execution_steps.sql
- 005_create_user_connections.sql  — include UNIQUE(user_id, connector_name)
- 006_create_oauth_state_cache.sql

### 2. `backend/scripts/run_migrations.py`:
- Read all .sql files in migrations/ in numerical order
- Execute each with aiosqlite
- Print "Applied: 00X_name.sql" for each
- Skip already-applied (track in a schema_migrations table)
- Use asyncio.run() as entry point

### 3. `backend/database.py`:
```python
# Async context manager for DB connections
# DB_PATH from config.py
# get_db() returns aiosqlite connection
```

## Self-Test ✅
```bash
cd backend && source .venv/bin/activate
python scripts/run_migrations.py
# Expected: "Applied: 001_create_log_entries.sql" through "Applied: 006..."
# Run again — expected: "Already applied" for all — no error
```