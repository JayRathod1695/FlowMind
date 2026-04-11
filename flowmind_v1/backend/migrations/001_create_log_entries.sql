CREATE TABLE IF NOT EXISTS log_entries (
    id TEXT PRIMARY KEY,
    trace_id TEXT,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    subsystem TEXT NOT NULL,
    action TEXT NOT NULL,
    data TEXT,
    duration_ms INTEGER,
    execution_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_log_entries_trace_id ON log_entries(trace_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_execution_id ON log_entries(execution_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp);
