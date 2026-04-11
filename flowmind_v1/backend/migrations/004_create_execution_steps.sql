CREATE TABLE IF NOT EXISTS execution_steps (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    connector TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    duration_ms INTEGER,
    input_json TEXT,
    output_json TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE,
    UNIQUE (execution_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_execution_steps_execution_id ON execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_steps_status ON execution_steps(status);
