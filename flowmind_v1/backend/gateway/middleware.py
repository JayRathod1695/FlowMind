import time
from collections.abc import Sequence

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from gateway.error_codes import INTERNAL_ERROR
from gateway.response_helpers import error_response
from log_service import write_log


def add_cors_middleware(app: FastAPI, allowed_origins: Sequence[str]) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(allowed_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def add_request_logging_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_logging_middleware(
        request: Request, call_next
    ) -> JSONResponse:
        started_at = time.monotonic()
        await write_log(
            "DEBUG",
            "gateway",
            "request_received",
            {"method": request.method, "path": request.url.path},
        )
        try:
            response = await call_next(request)
            duration_ms = int((time.monotonic() - started_at) * 1000)
            await write_log(
                "DEBUG",
                "gateway",
                "request_completed",
                {
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                },
                duration_ms=duration_ms,
            )
            return response
        except Exception as error:
            duration_ms = int((time.monotonic() - started_at) * 1000)
            await write_log(
                "ERROR",
                "gateway",
                "request_failed",
                {
                    "method": request.method,
                    "path": request.url.path,
                    "error_type": type(error).__name__,
                },
                duration_ms=duration_ms,
            )
            raise


def add_global_exception_handler(app: FastAPI) -> None:
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, error: Exception
    ) -> JSONResponse:
        await write_log(
            "ERROR",
            "gateway",
            "unhandled_exception",
            {
                "method": request.method,
                "path": request.url.path,
                "error_type": type(error).__name__,
                "message": str(error),
            },
        )
        return error_response(INTERNAL_ERROR, "Unexpected error", 500)
