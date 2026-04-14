import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from chat_store import init_db
from conversation_store import init_db as init_conversation_db
from config import CORS_ALLOWED_ORIGINS, MCP_SERVERS
from executor.agent_runtime import pre_initialize_runtime, shutdown_runtime
from gateway.middleware import (
    add_cors_middleware,
    add_global_exception_handler,
    add_request_logging_middleware,
)
from gateway.router_agent import router as agent_router
from gateway.router_conversation import router as conversation_router
from gateway.router_health import router as health_router
from gateway.router_logs import router as logs_router
from gateway.router_webhooks import router as webhooks_router
from log_service import write_log


@asynccontextmanager
async def lifespan(_: FastAPI):
    await write_log("INFO", "gateway", "application_startup")
    init_db()
    init_conversation_db()
    print("\n🚀 FlowMind backend starting...")
    print(f"  📡 MCP servers configured: {len(MCP_SERVERS)}")
    print("  ⏳ Loading MCP tools (this may take a moment)...\n")

    # Pre-initialize MCP servers so first request is fast
    asyncio.create_task(pre_initialize_runtime())

    try:
        yield
    finally:
        await shutdown_runtime()
        await write_log("INFO", "gateway", "application_shutdown")
        print("\n🛑 FlowMind backend stopped.")


app = FastAPI(title="FlowMind Backend", version="0.2.0", lifespan=lifespan)

add_cors_middleware(app, CORS_ALLOWED_ORIGINS)
add_request_logging_middleware(app)
add_global_exception_handler(app)

app.include_router(agent_router)
app.include_router(conversation_router)
app.include_router(health_router)
app.include_router(logs_router)
app.include_router(webhooks_router)
