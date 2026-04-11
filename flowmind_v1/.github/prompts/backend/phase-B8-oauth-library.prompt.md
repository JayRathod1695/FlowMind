agent: agent

# Phase B8 — Connector Library (Per-User OAuth System)

Use @backend-agent for this phase.
Reference `.github/instructions/security.instructions.md` — ALL rules apply here.

## Goal
Implement the full Connector Library module: OAuth flow, Fernet encryption,
PKCE + state CSRF protection, token refresh, and all /api/connectors/* endpoints.

## Deliverables

### `backend/connector_library/token_encryption.py`:
Exact implementation from Report 2 Section 10B:
- `encrypt(plaintext_token: str) -> str`
- `decrypt(encrypted_token: str) -> str`
- Uses TOKEN_ENCRYPTION_KEY from config.py
- Imported ONLY in library_service.py

### `backend/connector_library/state_cache.py`:
- `write_state(state, connector_name, user_id, code_verifier) -> None`
- `validate_state(state) -> dict` — raises OAuthStateInvalidError if missing/expired
- `expire_old_states()` — deletes rows older than 10 minutes

### `backend/connector_library/connector_configs.py`:
- Read JIRA/GITHUB/SLACK/GOOGLE CLIENT_ID, CLIENT_SECRET, REDIRECT_URI from config.py
- `get_config(connector_name: str) -> ConnectorConfig`
- Auth URLs and token endpoints for each provider

### `backend/connector_library/oauth_manager.py`:
- `build_auth_url(connector_name, state, code_challenge) -> str`
- `exchange_code(connector_name, code, code_verifier) -> TokenResponse`
  (httpx POST to token endpoint, returns access_token, refresh_token, expires_at)
- `refresh_token(connector_name, encrypted_refresh_token) -> TokenResponse`
- `revoke_token(connector_name, encrypted_access_token) -> None`

### `backend/connector_library/library_service.py`:
- `get_token(user_id, connector_name) -> str` (decrypted access token)
  → checks expiry, auto-refreshes if needed
  → raises ConnectorNotAuthenticatedError or ConnectorTokenExpiredError
- `save_token(user_id, connector_name, token_response, account_label)`
  → encrypts before INSERT/UPSERT into user_connections
- `revoke_token(user_id, connector_name)` → DELETE row, call oauth_manager.revoke_token()
- `get_status(user_id) -> list[ConnectorConnection]`

### Update `gateway/router_connectors.py`:
Wire all 5 endpoints to connector_library functions.
Implement the OAuth callback route (Step 7-14 from Report 2 Section 10A).

## Self-Test ✅
```bash
# Test encryption round-trip (no OAuth credentials needed):
cd backend && source .venv/bin/activate
python -c "
from connector_library.token_encryption import encrypt, decrypt
token = 'test_access_token_12345'
encrypted = encrypt(token)
decrypted = decrypt(encrypted)
assert token == decrypted, 'Encryption round-trip failed!'
print('✅ Encryption round-trip passed')
"

# Test state cache:
python -c "
import asyncio
from connector_library.state_cache import write_state, validate_state
async def test():
    await write_state('abc123', 'jira', 'user1', 'verifier_xyz')
    result = await validate_state('abc123')
    assert result['connector_name'] == 'jira'
    print('✅ State cache passed')
asyncio.run(test())
"
```

## ⚠️ MANUAL STEPS REQUIRED for full OAuth flow
Register OAuth apps at each provider console (URLs in Report 2 Section 10E).
Fill CLIENT_ID, CLIENT_SECRET values in your .env file before testing OAuth.