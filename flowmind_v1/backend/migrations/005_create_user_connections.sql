CREATE TABLE IF NOT EXISTS user_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    connector_name TEXT NOT NULL,
    status TEXT NOT NULL,
    encrypted_access_token TEXT,
    encrypted_refresh_token TEXT,
    token_expires_at TEXT,
    scopes TEXT,
    connected_account_label TEXT,
    connected_at TEXT NOT NULL,
    last_used_at TEXT,
    error_message TEXT,
    UNIQUE (user_id, connector_name)
);

CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_connector_name ON user_connections(connector_name);
