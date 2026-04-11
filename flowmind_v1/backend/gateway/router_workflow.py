from fastapi import APIRouter
from fastapi.responses import JSONResponse

from gateway.error_codes import INTERNAL_ERROR, PLANNER_PARSE_ERROR, PLANNER_UNAVAILABLE
from gateway.models import GenerateDAGRequest
from gateway.response_helpers import error_response, success_response
from log_service import write_log
from planner.planner_parser import ParseError
from planner.planner_service import LLMUnavailableError, generate_dag

router = APIRouter()


@router.post("/api/workflow/generate")
async def generate_workflow(request: GenerateDAGRequest) -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "POST", "path": "/api/workflow/generate"},
    )
    try:
        planner_result = await generate_dag(
            request.natural_language,
            request.available_connectors,
        )
        return success_response(
            {"dag_json": planner_result.model_dump(by_alias=True)}
        )
    except LLMUnavailableError as error:
        await write_log(
            "ERROR",
            "planner",
            "planner_unavailable",
            {"error_type": type(error).__name__, "message": str(error)},
        )
        return error_response(
            PLANNER_UNAVAILABLE,
            "Planner service unavailable",
            503,
        )
    except ParseError as error:
        await write_log(
            "ERROR",
            "planner",
            "planner_parse_failed",
            {"error_type": type(error).__name__, "message": str(error)},
        )
        return error_response(
            PLANNER_PARSE_ERROR,
            "Planner response could not be parsed",
            502,
        )
    except Exception as error:
        await write_log(
            "ERROR",
            "gateway",
            "workflow_generate_failed",
            {"error_type": type(error).__name__, "message": str(error)},
        )
        return error_response(
            INTERNAL_ERROR,
            "Unexpected error",
            500,
        )


@router.get("/api/workflow/past")
async def get_past_workflows() -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "GET", "path": "/api/workflow/past"},
    )
    return success_response([])


@router.post("/api/workflow/save")
async def save_workflow() -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "POST", "path": "/api/workflow/save"},
    )
    return success_response({"workflow_id": "stub-id"})
