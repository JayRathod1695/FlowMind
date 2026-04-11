---
applyTo: "backend/connector_library/**"
---

# Security Instructions — OAuth Connector Library

## OAuth Flow Implementation Rules
- State parameter: cryptographically random 32-byte hex (secrets.token_hex(32))
- PKCE: always S256 method. code_verifier = secrets.token_urlsafe(64)
- code_challenge = base64url(sha256(code_verifier.encode()))
- state stored in oauth_state_cache table with created_at timestamp
- State expires after 10 minutes — reject if older
- State is ONE-TIME USE — delete row immediately after successful validation
- redirect_uri is HARDCODED in connector_configs.py — NEVER taken from request

## Token Storage Rules
- Access tokens and refresh tokens: Fernet-encrypt BEFORE any DB insert
- Fernet-decrypt AFTER any DB select
- The plaintext token NEVER touches aiosqlite layer
- token_encryption.py is imported ONLY in library_service.py

## Logging Rules for This Module
```python
# CORRECT — safe to log
await write_log("INFO", "connector_library", "oauth_flow_completed",
                {"connector_name": name, "user_id": user_id, "account_label": label})

# WRONG — NEVER do this
await write_log("INFO", "connector_library", "token_stored",
                {"token": access_token})  # ← FORBIDDEN
```

## Token Refresh Flow
1. Before every connector call: check token_expires_at < now
2. If expired: call oauth_manager.refresh_token(user_id, connector_name)
3. If refresh succeeds: re-encrypt, update user_connections row, proceed
4. If refresh fails: set status='error' in user_connections, raise ConnectorTokenExpiredError
5. Executor catches ConnectorTokenExpiredError → sets step to failed with clear message

## Disconnect Flow
1. Delete user_connections row (status becomes disconnected implicitly)
2. Call provider's revocation endpoint to invalidate the token at source
3. Log { connector_name, user_id } at INFO level