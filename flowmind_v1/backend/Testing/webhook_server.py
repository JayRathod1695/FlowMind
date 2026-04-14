import asyncio
import hmac
import hashlib
import uuid
import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
from enum import Enum
from fastapi import FastAPI, Request
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

# ═══════════════════════════════════════════════════════════════════
# TASK QUEUE — Pure Python stdlib, no external deps
# ═══════════════════════════════════════════════════════════════════

class TaskStatus(Enum):
    WAITING  = "waiting"
    RESUMED  = "resumed"
    DONE     = "done"
    FAILED   = "failed"

@dataclass
class DeferredTask:
    task_id:        str
    user_prompt:    str
    status:         TaskStatus
    webhook_type:   str
    webhook_filter: dict
    created_at:     datetime       = field(default_factory=datetime.now)
    event_data:     Optional[dict] = None
    resume_event:   asyncio.Event  = field(default_factory=asyncio.Event)

class TaskQueue:
    def __init__(self):
        self._tasks: dict[str, DeferredTask] = {}

    def create_task(self, user_prompt: str, webhook_type: str, webhook_filter: dict) -> DeferredTask:
        task_id = str(uuid.uuid4())[:8]
        task = DeferredTask(
            task_id=task_id,
            user_prompt=user_prompt,
            status=TaskStatus.WAITING,
            webhook_type=webhook_type,
            webhook_filter=webhook_filter,
        )
        self._tasks[task_id] = task
        print(f"\n⏳ Task [{task_id}] registered — waiting for {webhook_type} event")
        return task

    def resume_task(self, webhook_type: str, event_data: dict) -> Optional[DeferredTask]:
        for task in self._tasks.values():
            if task.status == TaskStatus.WAITING and task.webhook_type == webhook_type:
                if self._matches(task.webhook_filter, event_data):
                    task.event_data = event_data
                    task.status     = TaskStatus.RESUMED
                    task.resume_event.set()
                    print(f"\n🔔 Task [{task.task_id}] resumed by {webhook_type} event!")
                    return task
        return None

    def get_waiting_tasks(self) -> list[DeferredTask]:
        return [t for t in self._tasks.values() if t.status == TaskStatus.WAITING]

    def _matches(self, f: dict, e: dict) -> bool:
        for key, expected in f.items():
            actual = e.get(key)
            if isinstance(expected, str) and isinstance(actual, str):
                if actual.lower() != expected.lower():
                    return False
                continue
            if actual != expected:
                return False
        return True

# Global instance shared across the whole app
task_queue = TaskQueue()

# ═══════════════════════════════════════════════════════════════════
# FASTAPI WEBHOOK SERVER
# ═══════════════════════════════════════════════════════════════════

app = FastAPI()
GITHUB_WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")

# ── GitHub Webhook ─────────────────────────────────────────────────
@app.post("/webhooks/github")
async def github_webhook(request: Request):
    payload    = await request.json()
    event_type = request.headers.get("X-GitHub-Event", "")
    action     = payload.get("action", "")
    repo_name  = payload.get("repository", {}).get("name", "")
    sender     = payload.get("sender", {}).get("login", "")

    pr             = payload.get("pull_request", {})
    pr_number      = pr.get("number")
    pr_title       = pr.get("title", "")
    pr_url         = pr.get("html_url", "")
    pr_branch      = pr.get("head", {}).get("ref", "")

    issue          = payload.get("issue", {})
    issue_number   = issue.get("number")
    issue_title    = issue.get("title", "")
    issue_url      = issue.get("html_url", "")

    print(f"\n📥 GitHub → {event_type}/{action} on {repo_name} by {sender}")

    event_data = {
        "event_type":   event_type,
        "action":       action,
        "repo":         repo_name,
        "sender":       sender,
        "pr_number":    pr_number,
        "pr_title":     pr_title,
        "pr_url":       pr_url,
        "pr_branch":    pr_branch,
        "issue_number": issue_number,
        "issue_title":  issue_title,
        "issue_url":    issue_url,
    }

    task_queue.resume_task("github_pr",    event_data)
    task_queue.resume_task("github_issue", event_data)
    
    return {"status": "received"}

# ── Slack Webhook ──────────────────────────────────────────────────
@app.post("/webhooks/slack")
async def slack_webhook(request: Request):
    payload = await request.json()

    # One-time URL verification from Slack
    if payload.get("type") == "url_verification":
        return {"challenge": payload.get("challenge")}

    event      = payload.get("event", {})
    event_type = event.get("type", "")
    user       = event.get("user", "")
    channel    = event.get("channel", "")
    text       = event.get("text", "")
    ts         = event.get("ts", "")
    bot_id     = event.get("bot_id")

    # Ignore bot's own messages to prevent loops
    if bot_id:
        return {"status": "ignored"}

    print(f"\n📥 Slack → {event_type} in #{channel} by {user}")
    print(f"   └─ Text: {text[:100]}")

    event_data = {
        "event_type": event_type,
        "user":       user,
        "channel":    channel,
        "text":       text,
        "ts":         ts,
    }

    task = task_queue.resume_task("slack_message", event_data)
    if task:
        print(f"   └─ ✅ Resumed task [{task.task_id}]")

    return {"status": "ok"}

# ── Health check ───────────────────────────────────────────────────
@app.get("/health")
async def health():
    waiting = task_queue.get_waiting_tasks()
    return {
        "status":        "running",
        "waiting_tasks": len(waiting),
        "tasks": [
            {
                "id":     t.task_id,
                "type":   t.webhook_type,
                "prompt": t.user_prompt[:60],
            }
            for t in waiting
        ],
    }
