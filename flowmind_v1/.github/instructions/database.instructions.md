---
applyTo: "backend/migrations/**"
---

# Database Instructions — SQLite Migrations

## Migration File Naming
- Sequential: 001_create_log_entries.sql through 006_create_oauth_state_cache.sql
- Never modify an existing migration — add a new one for changes
- Run order enforced by scripts/run_migrations.py

## Required Tables (in order)
001 — log_entries (id, trace_id, timestamp, level, subsystem, action, data, duration_ms, execution_id)
002 — workflows (id, name, natural_language, dag_json, created_at, last_executed_at, execution_count)
003 — executions (id, workflow_id, status, started_at, completed_at, dag_json)
004 — execution_steps (id, execution_id, step_id, connector, tool_name, status, started_at, completed_at, duration_ms, input_json, output_json, retry_count, error_message)
005 — user_connections (id, user_id, connector_name, status, encrypted_access_token, encrypted_refresh_token, token_expires_at, scopes, connected_account_label, connected_at, last_used_at, error_message)
006 — oauth_state_cache (state, connector_name, user_id, code_verifier, created_at)

## Important Constraints
- user_connections: UNIQUE(user_id, connector_name) — one connection per user per connector
- oauth_state_cache: state is PK, expires after 10 min — background cleaner deletes old rows
- log_entries: no FK constraints — fire-and-forget, must never block on FK violation
- All timestamps: ISO 8601 with milliseconds stored as TEXT