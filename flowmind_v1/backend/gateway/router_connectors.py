from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, RedirectResponse

from connector_library.connector_configs import ConnectorConfigError
from connector_library.oauth_manager import OAuthExchangeError
from connector_library.state_cache import OAuthStateInvalidError
from gateway.error_codes import (
    CONNECTOR_NOT_SUPPORTED,
    CONNECTOR_OAUTH_NOT_CONFIGURED,
    INTERNAL_ERROR,
)
from gateway.models import ConnectRequest, DisconnectRequest
from gateway.response_helpers import error_response, success_response
from gateway.router_connectors_helpers import (
    ConnectorOAuthNotConfiguredError,
    create_auth_url,
    disconnect_user_connector,
    get_status_payload,
    handle_callback,
    normalize_connector_name,
    redirect_url,
    validate_connector,
)
from log_service import write_log

router = APIRouter()
ConnectorName = Literal["jira", "github", "slack", "sheets", "google"]

CONNECTOR_DEFINITIONS = [
    {"name": "jira", "display_name": "Jira"},
    {"name": "github", "display_name": "GitHub"},
    {"name": "slack", "display_name": "Slack"},
    {"name": "sheets", "display_name": "Google Sheets"},
]


@router.get("/api/connectors/available")
async def get_available_connectors() -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "GET", "path": "/api/connectors/available"},
    )
    return success_response({"connectors": CONNECTOR_DEFINITIONS})


@router.get("/api/connectors/status")
async def get_connector_status(user_id: str = Query(..., min_length=1, max_length=120)) -> JSONResponse:
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "GET", "path": "/api/connectors/status", "user_id": user_id},
    )
    try:
        return success_response({"connectors": await get_status_payload(user_id)})
    except Exception as error:
        await write_log(
            "ERROR",
            "gateway",
            "connector_status_failed",
            {"user_id": user_id, "error_type": type(error).__name__, "message": str(error)},
        )
        return error_response(INTERNAL_ERROR, "Unexpected error", 500)


@router.post("/api/connectors/{connector_name}/connect")
async def connect_connector(connector_name: ConnectorName, request: ConnectRequest) -> JSONResponse:
    normalized_connector = normalize_connector_name(connector_name)
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {
            "method": "POST",
            "path": "/api/connectors/{connector_name}/connect",
            "connector_name": normalized_connector,
            "user_id": request.user_id,
        },
    )
    try:
        validate_connector(normalized_connector)
        auth_url = await create_auth_url(normalized_connector, request.user_id)
        return success_response(
            {
                "connector_name": normalized_connector,
                "user_id": request.user_id,
                "auth_url": auth_url,
            }
        )
    except ConnectorConfigError:
        return error_response(CONNECTOR_NOT_SUPPORTED, "Connector is not supported", 400)
    except ConnectorOAuthNotConfiguredError:
        return error_response(
            CONNECTOR_OAUTH_NOT_CONFIGURED,
            "Connector OAuth configuration is missing",
            400,
        )
    except Exception as error:
        await write_log(
            "ERROR",
            "gateway",
            "connector_connect_failed",
            {
                "connector_name": normalized_connector,
                "user_id": request.user_id,
                "error_type": type(error).__name__,
                "message": str(error),
            },
        )
        return error_response(INTERNAL_ERROR, "Unexpected error", 500)


@router.get("/api/connectors/{connector_name}/callback")
async def connector_callback(
    connector_name: ConnectorName,
    state: str | None = Query(default=None),
    code: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
) -> RedirectResponse:
    normalized_connector = normalize_connector_name(connector_name)
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {"method": "GET", "path": "/api/connectors/{connector_name}/callback", "connector_name": normalized_connector},
    )
    if error:
        await write_log(
            "WARN",
            "gateway",
            "connector_callback_rejected",
            {"connector_name": normalized_connector, "message": error_description or error},
        )
        return RedirectResponse(url=redirect_url(normalized_connector, connected=False, error=error))
    if not state or not code:
        return RedirectResponse(
            url=redirect_url(normalized_connector, connected=False, error="missing_code_or_state")
        )

    try:
        await handle_callback(normalized_connector, state, code)
        return RedirectResponse(url=redirect_url(normalized_connector, connected=True))
    except OAuthStateInvalidError:
        return RedirectResponse(
            url=redirect_url(normalized_connector, connected=False, error="invalid_state")
        )
    except OAuthExchangeError:
        return RedirectResponse(
            url=redirect_url(
                normalized_connector,
                connected=False,
                error="oauth_exchange_failed",
            )
        )
    except Exception as error_obj:
        await write_log(
            "ERROR",
            "gateway",
            "connector_callback_failed",
            {
                "connector_name": normalized_connector,
                "error_type": type(error_obj).__name__,
                "message": str(error_obj),
            },
        )
        return RedirectResponse(url=redirect_url(normalized_connector, connected=False, error="oauth_failed"))


@router.post("/api/connectors/{connector_name}/disconnect")
async def disconnect_connector(connector_name: ConnectorName, request: DisconnectRequest) -> JSONResponse:
    normalized_connector = normalize_connector_name(connector_name)
    await write_log(
        "DEBUG",
        "gateway",
        "request_received",
        {
            "method": "POST",
            "path": "/api/connectors/{connector_name}/disconnect",
            "connector_name": normalized_connector,
            "user_id": request.user_id,
        },
    )
    try:
        validate_connector(normalized_connector)
        await disconnect_user_connector(request.user_id, normalized_connector)
        return success_response(
            {"connector_name": normalized_connector, "user_id": request.user_id, "success": True}
        )
    except ConnectorConfigError:
        return error_response(CONNECTOR_NOT_SUPPORTED, "Connector is not supported", 400)
    except Exception as error:
        await write_log(
            "ERROR",
            "gateway",
            "connector_disconnect_failed",
            {
                "connector_name": normalized_connector,
                "user_id": request.user_id,
                "error_type": type(error).__name__,
                "message": str(error),
            },
        )
        return error_response(INTERNAL_ERROR, "Unexpected error", 500)
