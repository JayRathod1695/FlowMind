from __future__ import annotations

import hashlib
import hmac
import os

from fastapi import APIRouter, HTTPException, Request

from gateway.webhook_queue import task_queue

router = APIRouter()
GITHUB_WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")


def verify_github_signature(payload_bytes: bytes, signature: str) -> bool:
    if not GITHUB_WEBHOOK_SECRET:
        return True

    expected = "sha256=" + hmac.new(
        GITHUB_WEBHOOK_SECRET.encode(),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhooks/github")
async def github_webhook(request: Request) -> dict:
    payload_bytes = await request.body()
    payload = await request.json()
    signature = request.headers.get("X-Hub-Signature-256", "")
    event_type = request.headers.get("X-GitHub-Event", "")
    action = payload.get("action", "")
    repo_name = payload.get("repository", {}).get("name", "")
    sender = payload.get("sender", {}).get("login", "")

    if GITHUB_WEBHOOK_SECRET and not verify_github_signature(payload_bytes, signature):
        raise HTTPException(status_code=401, detail="Invalid GitHub signature")

    pr = payload.get("pull_request", {})
    pr_number = pr.get("number")
    pr_title = pr.get("title", "")
    pr_url = pr.get("html_url", "")
    pr_branch = pr.get("head", {}).get("ref", "")

    issue = payload.get("issue", {})
    issue_number = issue.get("number")
    issue_title = issue.get("title", "")
    issue_url = issue.get("html_url", "")

    print(f"\nGitHub webhook -> {event_type}/{action} on {repo_name} by {sender}")

    event_data = {
        "event_type": event_type,
        "action": action,
        "repo": repo_name,
        "sender": sender,
        "pr_number": pr_number,
        "pr_title": pr_title,
        "pr_url": pr_url,
        "pr_branch": pr_branch,
        "issue_number": issue_number,
        "issue_title": issue_title,
        "issue_url": issue_url,
    }

    resumed_pr = task_queue.resume_task("github_pr", event_data)
    resumed_issue = task_queue.resume_task("github_issue", event_data)
    if resumed_pr or resumed_issue:
        print("Webhook matched one or more waiting tasks")

    return {"status": "received"}


@router.post("/webhooks/slack")
async def slack_webhook(request: Request) -> dict:
    payload = await request.json()

    if payload.get("type") == "url_verification":
        return {"challenge": payload.get("challenge")}

    event = payload.get("event", {})
    event_type = event.get("type", "")
    user = event.get("user", "")
    channel = event.get("channel", "")
    text = event.get("text", "")
    ts = event.get("ts", "")

    bot_id = event.get("bot_id")
    if bot_id:
        return {"status": "ignored"}

    print(f"\nSlack webhook -> {event_type} in {channel} by {user}")

    event_data = {
        "event_type": event_type,
        "user": user,
        "channel": channel,
        "text": text,
        "ts": ts,
    }

    resumed = task_queue.resume_task("slack_message", event_data)
    if resumed:
        print(f"Resumed task [{resumed.task_id}]")

    return {"status": "ok"}


@router.get("/webhooks/health")
async def webhooks_health() -> dict:
    waiting = task_queue.get_waiting_tasks()
    return {
        "status": "running",
        "waiting_tasks": len(waiting),
        "tasks": [
            {
                "id": task.task_id,
                "type": task.webhook_type,
                "prompt": task.user_prompt[:60],
            }
            for task in waiting
        ],
    }