import asyncio
import uuid

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from executor.executor_service import (
    approve_step,
    execute_dag,
    get_execution_status as get_execution_status_payload,
    register_execution,
)
from gateway.error_codes import (
    APPROVAL_NOT_PENDING,
    EXECUTION_INVALID_DAG,
    EXECUTION_NOT_FOUND,
    INTERNAL_ERROR,
)
from gateway.models import ApproveRequest, StartExecutionRequest
from gateway.response_helpers import error_response, success_response
from log_service import write_log

router = APIRouter()
DEFAULT_USER_ID = "local-user"


@router.post("/api/execution/start")
async def start_execution(request: StartExecutionRequest) -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "POST", "path": "/api/execution/start"},
    )
    execution_id = str(uuid.uuid4())

    try:
        await register_execution(
            workflow_id=request.workflow_id,
            dag_json=request.dag_json,
            user_id=DEFAULT_USER_ID,
            execution_id=execution_id,
        )
        asyncio.create_task(
            execute_dag(
                request.workflow_id,
                request.dag_json,
                DEFAULT_USER_ID,
                execution_id,
            )
        )
        return success_response(
            {
                "execution_id": execution_id,
                "status": "running",
                "workflow_id": request.workflow_id,
            }
        )
    except ValueError as error:
        return error_response(
            EXECUTION_INVALID_DAG,
            str(error),
            400,
        )
    except Exception as error:
        await write_log(
            "ERROR",
            "gateway",
            "execution_start_failed",
            {"error_type": type(error).__name__, "message": str(error)},
        )
        return error_response(INTERNAL_ERROR, "Unexpected error", 500)


@router.post("/api/execution/{execution_id}/approve")
async def approve_execution_step(
    execution_id: str, request: ApproveRequest
) -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {
            "method": "POST",
            "path": "/api/execution/{execution_id}/approve",
            "execution_id": execution_id,
        },
    )
    try:
        approval_recorded = await approve_step(
            execution_id,
            request.step_id,
            request.approved,
        )
        if not approval_recorded:
            return error_response(
                APPROVAL_NOT_PENDING,
                "No pending approval found for this execution step",
                404,
            )

        return success_response(
            {
                "execution_id": execution_id,
                "step_id": request.step_id,
                "approved": request.approved,
                "status": "recorded",
            }
        )
    except Exception as error:
        await write_log(
            "ERROR",
            "gateway",
            "execution_approval_failed",
            {
                "execution_id": execution_id,
                "step_id": request.step_id,
                "error_type": type(error).__name__,
                "message": str(error),
            },
        )
        return error_response(INTERNAL_ERROR, "Unexpected error", 500)


@router.get("/api/execution/{execution_id}/status")
async def get_execution_status(execution_id: str) -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {
            "method": "GET",
            "path": "/api/execution/{execution_id}/status",
            "execution_id": execution_id,
        },
    )
    try:
        status_payload = await get_execution_status_payload(execution_id)
        if status_payload is None:
            return error_response(
                EXECUTION_NOT_FOUND,
                "Execution not found",
                404,
            )
        return success_response(status_payload)
    except Exception as error:
        await write_log(
            "ERROR",
            "gateway",
            "execution_status_failed",
            {
                "execution_id": execution_id,
                "error_type": type(error).__name__,
                "message": str(error),
            },
        )
        return error_response(INTERNAL_ERROR, "Unexpected error", 500)
