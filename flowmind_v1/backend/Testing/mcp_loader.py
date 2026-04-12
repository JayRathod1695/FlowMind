import asyncio
from contextlib import AsyncExitStack
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

def mcp_to_openai_tools(mcp_tools):
    return [
        {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema,
            },
        }
        for tool in mcp_tools
    ]

async def load_all_servers(stack: AsyncExitStack, servers: dict):
    all_tools  = []
    tool_router = {}   # tool_name → (session, server_name)
    failed     = []

    for server_name, cfg in servers.items():
        try:
            params = StdioServerParameters(
                command=cfg["command"],
                args=[a for a in cfg.get("args", []) if a is not None],
                env=cfg.get("env", {}),
            )
            read, write = await stack.enter_async_context(stdio_client(params))
            session     = await stack.enter_async_context(ClientSession(read, write))
            await session.initialize()

            tools_result = await session.list_tools()
            openai_tools = mcp_to_openai_tools(tools_result.tools)

            for tool in tools_result.tools:
                tool_router[tool.name] = (session, server_name)

            all_tools.extend(openai_tools)
            print(f"  ✅ {server_name:<12} → {len(tools_result.tools)} tools")

        except Exception as e:
            # If one server fails, skip it — don't crash everything
            print(f"  ❌ {server_name:<12} → failed ({str(e)[:60]})")
            failed.append(server_name)

    return all_tools, tool_router, failed
