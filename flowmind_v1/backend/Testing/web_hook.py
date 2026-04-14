import hmac
import hashlib
import os
from pathlib import Path
from fastapi import FastAPI, Request
from webhook_server import task_queue
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

app = FastAPI()

GITHUB_WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")

# ── Verify GitHub signature (security) ───────────────────────────
def verify_github_signature(payload_bytes: bytes, signature: str) -> bool:
    expected = "sha256=" + hmac.new(
        GITHUB_WEBHOOK_SECRET.encode(),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# ── GitHub Webhook ────────────────────────────────────────────────
@app.post("/webhooks/github")
async def github_webhook(request: Request):
    payload_bytes = await request.body()
    payload       = await request.json()
    signature     = request.headers.get("X-Hub-Signature-256", "")
    event_type    = request.headers.get("X-GitHub-Event", "")
    action        = payload.get("action", "")
    repo_name     = payload.get("repository", {}).get("name", "")
    sender        = payload.get("sender", {}).get("login", "")

    # PR events
    pr          = payload.get("pull_request", {})
    pr_number   = pr.get("number")
    pr_title    = pr.get("title", "")
    pr_url      = pr.get("html_url", "")
    pr_branch   = pr.get("head", {}).get("ref", "")

    # Issue events
    issue       = payload.get("issue", {})
    issue_number = issue.get("number")
    issue_title  = issue.get("title", "")
    issue_url    = issue.get("html_url", "")

    print(f"\n📥 GitHub → {event_type}/{action} on {repo_name} by {sender}")

    event_data = {
        "event_type":    event_type,
        "action":        action,
        "repo":          repo_name,
        "sender":        sender,
        "pr_number":     pr_number,
        "pr_title":      pr_title,
        "pr_url":        pr_url,
        "pr_branch":     pr_branch,
        "issue_number":  issue_number,
        "issue_title":   issue_title,
        "issue_url":     issue_url,
    }

    # Resume any task waiting for a GitHub PR event
    task = task_queue.resume_task("github_pr", event_data)
    if task:
        print(f"   └─ ✅ Resumed task [{task.task_id}]")
    else:
        print(f"   └─ ℹ️  No waiting task matched")

    return {"status": "received"}

# ── Slack Webhook ─────────────────────────────────────────────────
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

    # Ignore bot's own messages to avoid loops
    bot_id = event.get("bot_id")
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

# ── Health check ──────────────────────────────────────────────────
@app.get("/health")
async def health():
    waiting = task_queue.get_waiting_tasks()
    return {
        "status":        "running",
        "waiting_tasks": len(waiting),
        "tasks": [
            {
                "id":           t.task_id,
                "type":         t.webhook_type,
                "prompt":       t.user_prompt[:60],
            }
            for t in waiting
        ],
    }