CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    natural_language TEXT NOT NULL,
    dag_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_executed_at TEXT,
    execution_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
