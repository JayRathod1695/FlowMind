agent: agent

# Phase B7 — MCP Router + Real Connectors

Use @backend-agent for this phase.

## Goal
Implement the MCP Router and all 4 real connector modules using the Python SDKs
specified in Report 2 Section 4. Each connector wraps its SDK and calls the
Connector Library to fetch per-user tokens before making any API call.

## Deliverables

### `backend/mcp_router/router_service.py`:
```python
# async def route_tool_call(step: DAGNode, user_id: str) -> dict
# 1. Get connector name from step.connector
# 2. Call connector_library.get_token(user_id, connector_name)
#    → raises ConnectorNotAuthenticatedError if no token
# 3. Route to correct connector module based on connector_name
# 4. Return normalized response dict
```

### `backend/mcp_router/connector_jira.py`:
Implement using `jira` Python library:
- create_issue(jira_client, fields: dict) → issue key
- get_issue(jira_client, key: str) → issue dict
- update_status(jira_client, key: str, transition_id: str) → None

### `backend/mcp_router/connector_github.py`:
Implement using `PyGithub`:
- create_branch(repo, ref: str, sha: str)
- open_pr(repo, title, body, head, base) → PR number
- add_comment(issue, body: str) → comment id

### `backend/mcp_router/connector_slack.py`:
Implement using `slack-sdk`:
- send_message(client, channel: str, text: str) → ts
- notify_user(client, user_id: str, text: str)
- post_to_channel(client, channel: str, blocks: list) → ts

### `backend/mcp_router/connector_sheets.py`:
Implement using `gspread` + `google-auth`:
- append_row(worksheet, values: list) → None
- read_range(worksheet, range_str: str) → list[list]
- update_cell(worksheet, cell: str, value: str) → None

## ⚠️ MANUAL STEPS REQUIRED — NO SELF-TEST
Real connector calls require:
1. OAuth app registered at each provider developer console (see Report 2 Section 10E)
2. Per-user OAuth flow completed (Connector Library — Phase B8)
3. Valid tokens in user_connections table

No automated test for this phase. Integration testing happens after Phase B8 + frontend Phase F8.