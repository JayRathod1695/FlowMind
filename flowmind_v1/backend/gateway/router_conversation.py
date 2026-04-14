from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from conversation_store import get_conversation_session
from executor.conversation_runtime import handle_conversation_turn, send_conversation_message, start_conversation
from gateway.models import ConversationMessageRequest, ConversationStartRequest
from gateway.response_helpers import error_response, success_response
from log_service import write_log

router = APIRouter()


@router.post("/api/conversations/start")
async def start_conversation_route(request: ConversationStartRequest) -> JSONResponse:
    await write_log("INFO", "conversation", "start_requested", {"prompt": request.prompt[:200]})
    try:
        result = await start_conversation(request.prompt)
        return success_response(result)
    except RuntimeError as error:
        message = str(error)
        if "LLM_API_KEY is not configured" in message:
            return error_response("AGENT_NOT_CONFIGURED", "Set LLM_API_KEY or NVIDIA_API_KEY in backend .env and restart.", 503)
        return error_response("INTERNAL_ERROR", message or "Unexpected error", 500)
    except Exception as error:
        await write_log(
            "ERROR",
            "conversation",
            "start_failed",
            {"error_type": type(error).__name__, "message": str(error)},
        )
        return error_response("INTERNAL_ERROR", "Unexpected error", 500)


@router.post("/api/conversations/{conversation_id}/message")
async def send_conversation_message_route(conversation_id: str, request: ConversationMessageRequest) -> JSONResponse:
    await write_log(
        "INFO",
        "conversation",
        "message_received",
        {"conversation_id": conversation_id, "message": request.message[:200]},
    )
    try:
        result = await send_conversation_message(conversation_id, request.message)
        return success_response(result)
    except RuntimeError as error:
        message = str(error)
        if "LLM_API_KEY is not configured" in message:
            return error_response("AGENT_NOT_CONFIGURED", "Set LLM_API_KEY or NVIDIA_API_KEY in backend .env and restart.", 503)
        if "not found" in message.lower():
            return error_response("CONVERSATION_NOT_FOUND", message, 404)
        return error_response("INTERNAL_ERROR", message or "Unexpected error", 500)
    except Exception as error:
        await write_log(
            "ERROR",
            "conversation",
            "message_failed",
            {
                "conversation_id": conversation_id,
                "error_type": type(error).__name__,
                "message": str(error),
            },
        )
        return error_response("INTERNAL_ERROR", "Unexpected error", 500)


@router.get("/api/conversations/{conversation_id}")
async def get_conversation_route(conversation_id: str) -> JSONResponse:
    session = get_conversation_session(conversation_id)
    if not session:
        return error_response("CONVERSATION_NOT_FOUND", f"Conversation {conversation_id} not found", 404)
    return success_response(session)


@router.post("/api/conversations/{conversation_id}/turn")
async def handle_turn_route(conversation_id: str) -> JSONResponse:
    session = get_conversation_session(conversation_id)
    if not session:
        return error_response("CONVERSATION_NOT_FOUND", f"Conversation {conversation_id} not found", 404)
    result = await handle_conversation_turn(conversation_id)
    return success_response(result)