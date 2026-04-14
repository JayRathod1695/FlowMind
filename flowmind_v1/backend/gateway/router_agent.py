from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse

from chat_store import get_chat, get_chats
from executor.agent_runtime import (
    execute_plan,
    get_plan,
    list_plans,
    plan_agent,
    run_agent,
    runtime_status,
    shutdown_runtime,
)
from executor.sse_stream import create_stream, get_stream, remove_stream
from gateway.models import AgentRunRequest
from gateway.response_helpers import error_response, success_response
from gateway.webhook_queue import DeferredTask, TaskStatus, task_queue
from log_service import write_log

router = APIRouter()


def build_hooks_summary(tasks: list[DeferredTask]) -> dict[str, Any]:
    ordered_tasks = sorted(tasks, key=lambda task: task.created_at, reverse=True)
    active: list[dict[str, Any]] = []
    inactive: list[dict[str, Any]] = []
    breakdown = {status.value: 0 for status in TaskStatus}

    for task in ordered_tasks:
        breakdown[task.status.value] += 1
        payload = task.to_dict()
        if task.status in {TaskStatus.WAITING, TaskStatus.RESUMED}:
            active.append(payload)
        else:
            inactive.append(payload)

    return {
        "active": active,
        "inactive": inactive,
        "summary": {
            "total": len(ordered_tasks),
            "active_count": len(active),
            "inactive_count": len(inactive),
            "breakdown": breakdown,
        },
    }


# ─── Quick Mode (plan + execute in one call) ─────────────────────

@router.post("/api/agent/run")
async def run_agent_prompt(request: AgentRunRequest) -> JSONResponse:
    await write_log("INFO", "agent", "prompt_received", {"prompt": request.prompt[:200]})
    try:
        result = await run_agent(request.prompt)
        return success_response(result)
    except RuntimeError as error:
        message = str(error)
        if "LLM_API_KEY is not configured" in message:
            return error_response("AGENT_NOT_CONFIGURED", "Set LLM_API_KEY or NVIDIA_API_KEY in backend .env and restart.", 503)
        return error_response("INTERNAL_ERROR", message or "Unexpected error", 500)
    except Exception as error:
        await write_log("ERROR", "agent", "agent_run_failed", {
            "error_type": type(error).__name__, "message": str(error),
        })
        return error_response("INTERNAL_ERROR", "Unexpected error", 500)


# ─── Phase 1: Generate Plan ──────────────────────────────────────

@router.post("/api/agent/plan")
async def generate_plan(request: AgentRunRequest) -> JSONResponse:
    await write_log("INFO", "agent", "plan_requested", {"prompt": request.prompt[:200]})
    try:
        plan = await plan_agent(request.prompt)
        return success_response(plan)
    except RuntimeError as error:
        message = str(error)
        if "LLM_API_KEY is not configured" in message:
            return error_response("AGENT_NOT_CONFIGURED", "Set LLM_API_KEY or NVIDIA_API_KEY in backend .env and restart.", 503)
        return error_response("INTERNAL_ERROR", message or "Unexpected error", 500)
    except Exception as error:
        await write_log("ERROR", "agent", "plan_failed", {
            "error_type": type(error).__name__, "message": str(error),
        })
        return error_response("INTERNAL_ERROR", "Unexpected error", 500)


# ─── Phase 2: Execute Plan ───────────────────────────────────────

@router.post("/api/agent/execute/{plan_id}")
async def execute_approved_plan(plan_id: str) -> JSONResponse:
    plan = get_plan(plan_id)
    if not plan:
        return error_response("PLAN_NOT_FOUND", f"Plan {plan_id} not found or expired", 404)

    await write_log("INFO", "agent", "execute_requested", {"plan_id": plan_id})

    # Create SSE stream before execution starts
    await create_stream(plan_id)

    try:
        result = await execute_plan(plan_id)
        return success_response(result)
    except RuntimeError as error:
        return error_response("EXECUTION_FAILED", str(error), 500)
    except Exception as error:
        await write_log("ERROR", "agent", "execute_failed", {
            "plan_id": plan_id, "error_type": type(error).__name__, "message": str(error),
        })
        return error_response("INTERNAL_ERROR", "Unexpected error", 500)
    finally:
        await remove_stream(plan_id)


# ─── SSE Stream ──────────────────────────────────────────────────

@router.get("/api/agent/execute/{plan_id}/stream")
async def stream_execution(plan_id: str) -> StreamingResponse:
    stream = await get_stream(plan_id)
    if not stream:
        # Create stream and wait for execution to start pushing events
        stream = await create_stream(plan_id)

    return StreamingResponse(
        stream.events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# ─── Plan Management ─────────────────────────────────────────────

@router.get("/api/agent/plans")
async def get_all_plans() -> JSONResponse:
    return success_response(list_plans())


@router.get("/api/agent/plan/{plan_id}")
async def get_plan_detail(plan_id: str) -> JSONResponse:
    plan = get_plan(plan_id)
    if not plan:
        return error_response("PLAN_NOT_FOUND", f"Plan {plan_id} not found", 404)
    return success_response(plan)


# ─── Chat History ────────────────────────────────────────────────

@router.get("/api/chats")
async def get_recent_chats(limit: int = 50) -> JSONResponse:
    return success_response(get_chats(limit=limit))


@router.get("/api/chats/waiting")
async def get_waiting_tasks() -> JSONResponse:
    waiting = task_queue.get_waiting_tasks()
    return success_response([
        task.to_dict(include_event_data=False)
        for task in waiting
    ])


@router.get("/api/chats/hooks")
async def get_hooks_summary_route() -> JSONResponse:
    return success_response(build_hooks_summary(task_queue.get_tasks()))


@router.get("/api/chats/{chat_id}")
async def get_chat_detail(chat_id: str) -> JSONResponse:
    chat = get_chat(chat_id)
    if not chat:
        return error_response("CHAT_NOT_FOUND", f"Chat {chat_id} not found", 404)
    return success_response(chat)


# ─── Runtime Management ──────────────────────────────────────────

@router.get("/api/agent/runtime")
async def get_agent_runtime_status() -> JSONResponse:
    return success_response(runtime_status())


@router.post("/api/agent/runtime/shutdown")
async def shutdown_agent_runtime() -> JSONResponse:
    await shutdown_runtime()
    return success_response({"runtime_shutdown": True})