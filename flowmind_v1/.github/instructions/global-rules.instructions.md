---
applyTo: "**"
---

# FlowMind Global Rules — Applied to All Files

## File Size Enforcement
- HARD LIMIT: 250 lines per file.
- If a component exceeds this: split logic into `ComponentName.helpers.ts`
  and sub-components into `ComponentName.sub.tsx`.
- If a Python module exceeds this: split into `module_name_helpers.py`.

## Naming Conventions
- Python: snake_case for everything. Full words: `execution_id` not `exec_id`.
- TypeScript: camelCase variables, PascalCase components/types, UPPER_SNAKE for constants.
- Error codes: UPPER_SNAKE_CASE strings in a single constants file.

## Error Handling
- Every function doing I/O (file, network, DB) must have try/catch or try/except.
- Python: subsystem errors bubble up to the API Gateway which catches all and returns:
  `{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }`
- TypeScript: api.client.ts handles all fetch errors uniformly.

## Logging Rules
- Python: ONLY use `await write_log(...)` — no print().
- TypeScript: ONLY use `logger.ts` — no console.log().
- NEVER log: access_token, refresh_token, client_secret, code (OAuth auth code).
- ALWAYS log for OAuth: only log { connector_name, user_id } — never token values.

## Secrets
- All secrets from .env. Never hardcode API keys, ports, or URLs.
- Python reads via `python-dotenv` into a `config.py` module.
- TypeScript reads from `src/lib/constants.ts` which reads `import.meta.env`.

## Testing Phases
- Some build phases include a self-test command — run it before moving to next phase.
- Phases marked ⚠️ MANUAL require your credentials/setup — no automated test possible.

## Skills Reference
These skill files in `.github/skills/` contain patterns — reference them when building:
- `backend-patterns/` → API, database, caching patterns
- `frontend-patterns/` → React, Zustand, SSE patterns
- `api-design/` → REST endpoint design, pagination, error responses
- `security-review/` → OAuth, encryption, CSRF mitigations
- `tdd-workflow/` → Write failing test first
- `ui-ux-pro-max/` → UI design system (frontend only)