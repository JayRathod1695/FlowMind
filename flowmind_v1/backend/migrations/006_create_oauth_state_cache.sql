CREATE TABLE IF NOT EXISTS oauth_state_cache (
    state TEXT PRIMARY KEY,
    connector_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    code_verifier TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_state_cache_created_at ON oauth_state_cache(created_at);
