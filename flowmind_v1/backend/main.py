import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from config import CORS_ALLOWED_ORIGINS
from gateway.middleware import (
	add_cors_middleware,
	add_global_exception_handler,
	add_request_logging_middleware,
)
from gateway.router_connectors import router as connectors_router
from gateway.router_execution import router as execution_router
from gateway.router_health import router as health_router
from gateway.router_logs import router as logs_router
from gateway.router_workflow import router as workflow_router
from health import health_service
from log_service import write_log


@asynccontextmanager
async def lifespan(_: FastAPI):
	health_check_task = asyncio.create_task(health_service.run_health_checks())
	await write_log("INFO", "gateway", "application_startup")
	try:
		yield
	finally:
		health_check_task.cancel()
		await asyncio.gather(health_check_task, return_exceptions=True)
		await write_log("INFO", "gateway", "application_shutdown")


app = FastAPI(title="FlowMind Backend", version="0.1.0", lifespan=lifespan)

add_cors_middleware(app, CORS_ALLOWED_ORIGINS)
add_request_logging_middleware(app)
add_global_exception_handler(app)

app.include_router(workflow_router)
app.include_router(execution_router)
app.include_router(logs_router)
app.include_router(health_router)
app.include_router(connectors_router)
