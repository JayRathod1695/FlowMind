import asyncio
import json
import os
import re
from pathlib import Path
from contextlib import AsyncExitStack
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv
from config import MCP_SERVERS
from mcp_loader import load_all_servers
from webhook_server import task_queue, DeferredTask

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

client = OpenAI(
    base_url=os.environ.get("LLM_BASE_URL"),
    api_key=os.environ.get("LLM_API_KEY"),
)
MODEL = os.environ.get("LLM_MODEL", "deepseek-ai/deepseek-v3.1-terminus")

SYSTEM_PROMPT = """You are FlowMind AI — a powerful assistant connected to:
- GitHub: repos, branches, issues, pull requests
- Slack: send messages, post to channels
- Jira: create/update tickets, sprints, projects
- Notion: read/write pages, databases, wikis
- PostgreSQL: query and manage database
- Linear: issues, cycles, projects
- Gmail: send/read emails
- Filesystem: read/write local project files
- DuckDuckGo: search the web in real time

Rules:
- Break multi-step tasks into logical order
- For cross-tool tasks: do the action first, then notify (Slack/email)
- For Slack messages to #channel names, first resolve channel_id via slack_list_channels, then call slack_post_message
- Always confirm what you did with specifics (links, IDs, names)
- If a tool fails, try an alternative approach
- Be concise and action-focused"""

SERVER_ICONS = {
    "github":     "🐙",
    "slack":      "💬",
    "jira":       "🟠",
    "notion":     "⚫",
    "postgres":   "🐘",
    "linear":     "🔵",
    "gmail":      "📧",
    "filesystem": "📂",
    "duckduckgo": "🔍",
}

_runtime_stack: Optional[AsyncExitStack] = None
_runtime_tools: list = []
_runtime_router: dict = {}
_runtime_failed: list[str] = []
_runtime_lock = asyncio.Lock()
_runtime_summary_printed = False


async def _ensure_runtime() -> tuple[list, dict, list[str]]:
    global _runtime_stack, _runtime_tools, _runtime_router, _runtime_failed

    if _runtime_stack is not None:
        return _runtime_tools, _runtime_router, _runtime_failed

    async with _runtime_lock:
        if _runtime_stack is not None:
            return _runtime_tools, _runtime_router, _runtime_failed

        stack = AsyncExitStack()
        await stack.__aenter__()
        all_tools, tool_router, failed = await load_all_servers(stack, MCP_SERVERS)

        _runtime_stack = stack
        _runtime_tools = all_tools
        _runtime_router = tool_router
        _runtime_failed = failed

    return _runtime_tools, _runtime_router, _runtime_failed


async def shutdown_runtime() -> None:
    global _runtime_stack, _runtime_tools, _runtime_router, _runtime_failed, _runtime_summary_printed

    if _runtime_stack is None:
        return

    await _runtime_stack.aclose()
    _runtime_stack = None
    _runtime_tools = []
    _runtime_router = {}
    _runtime_failed = []
    _runtime_summary_printed = False


def _format_tool_result(result) -> str:
    content_blocks = getattr(result, "content", None) or []
    if not content_blocks:
        return "Done"

    chunks: list[str] = []
    for block in content_blocks:
        text = getattr(block, "text", None)
        if text:
            chunks.append(text)
            continue

        try:
            chunks.append(json.dumps(block.model_dump(), ensure_ascii=False))
        except Exception:
            chunks.append(str(block))

    rendered = "\n".join(chunks).strip() or "Done"
    if getattr(result, "isError", False):
        return f"Tool returned error: {rendered}"
    return rendered

def ask_llm(messages: list, tools: list) -> object:
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=0.2,
        top_p=0.7,
        max_tokens=8192,
        stream=False,
        extra_body={"chat_template_kwargs": {"thinking": False}},
    )
    return response.choices[0].message

def stream_final_response(messages: list):
    print("\n🤖 FlowMind AI: ", end="", flush=True)
    completion = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.2,
        top_p=0.7,
        max_tokens=8192,
        extra_body={"chat_template_kwargs": {"thinking": False}},
        stream=True,
    )
    for chunk in completion:
        if getattr(chunk, "choices", None) and chunk.choices[0].delta.content is not None:
            print(chunk.choices[0].delta.content, end="", flush=True)
    print()

def needs_webhook(user_prompt: str) -> Optional[dict]:
    prompt_lower = user_prompt.lower()

    # PR events
    if any(p in prompt_lower for p in [
        "when a pr", "when pr", "if a pr", "when pull request",
        "if pull request", "when someone opens", "when pushed",
    ]):
        repo_match = re.search(
            r'(?:repo|repository)\s+[\'"]?([\w][\w-]*)[\'"]?',
            prompt_lower
        )
        repo = repo_match.group(1) if repo_match else "FlowMind"
        return {
            "webhook_type": "github_pr",
            "webhook_filter": {"repo": repo, "action": "opened"},
        }

    # ✅ NEW — Issue events
    if any(p in prompt_lower for p in [
        "when a new issue", "when an issue", "when issue",
        "if an issue", "if a new issue", "issue is created",
        "issue is opened", "new issue",
    ]):
        repo_match = re.search(
            r'(?:repo|repository)\s+[\'"]?([\w][\w-]*)[\'"]?',
            prompt_lower
        )
        repo = repo_match.group(1) if repo_match else "FlowMind"
        return {
            "webhook_type": "github_issue",
            "webhook_filter": {"repo": repo, "action": "opened"},
        }

    # Slack message events
    if any(p in prompt_lower for p in [
        "when someone messages", "when a message", "when slack",
    ]):
        return {
            "webhook_type":   "slack_message",
            "webhook_filter": {},
        }

    return None

async def execute_agent(user_prompt: str, all_tools: list, tool_router: dict):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_prompt},
    ]
    print(f"\n👤 You: {user_prompt}\n")

    step = 1
    while True:
        msg = ask_llm(messages, all_tools)

        if msg.tool_calls:
            messages.append(msg)
            for tool_call in msg.tool_calls:
                name    = tool_call.function.name
                args    = json.loads(tool_call.function.arguments)
                session, server_name = tool_router.get(name, (None, "unknown"))

                if not session:
                    print(f"⚠️  Unknown tool: {name}")
                    continue

                icon = SERVER_ICONS.get(server_name, "🔧")
                print(f"{icon} Step {step}: [{server_name}] → {name}")
                print(f"   └─ Args: {json.dumps(args, indent=6)}")

                try:
                    result = await session.call_tool(name, args)
                    result_text = _format_tool_result(result)
                except Exception as e:
                    detail = str(e).strip() or repr(e)
                    result_text = f"Tool error ({type(e).__name__}): {detail}"

                print(f"   └─ Result: {result_text[:300]}\n")
                messages.append({
                    "role":         "tool",
                    "tool_call_id": tool_call.id,
                    "content":      result_text,
                })
                step += 1
        else:
            messages.append({"role": "assistant", "content": msg.content or ""})
            stream_final_response(messages[:-1] + [
                {"role": "user", "content": "Summarize what you just did."}
            ])
            break

async def handle_deferred_task(task: DeferredTask, all_tools: list, tool_router: dict):
    print(f"\n⏸️  Waiting for [{task.webhook_type}] event... (you can give me other tasks!)\n")
    await task.resume_event.wait()
    print(f"\n▶️  Resuming task [{task.task_id}]...")

    followup = f"""
{task.user_prompt}

The event you were waiting for just fired. Event data:
{json.dumps(task.event_data, indent=2)}

Now complete the action you were supposed to take.
"""
    await execute_agent(followup, all_tools, tool_router)

async def run_agent(user_prompt: str, all_tools: list = None, tool_router: dict = None):
    global _runtime_summary_printed

    if all_tools is None:
        all_tools, tool_router, failed = await _ensure_runtime()
        if not _runtime_summary_printed:
            print(f"\n{'='*55}")
            print(f"  ✅ {len(all_tools)} tools across {len(MCP_SERVERS) - len(failed)} servers")
            if failed:
                print(f"  ⚠️  Skipped: {', '.join(failed)}")
            print(f"{'='*55}\n")
            _runtime_summary_printed = True

    webhook_config = needs_webhook(user_prompt)
    if webhook_config:
        task = task_queue.create_task(
            user_prompt=user_prompt,
            webhook_type=webhook_config["webhook_type"],
            webhook_filter=webhook_config["webhook_filter"],
        )
        asyncio.create_task(handle_deferred_task(task, all_tools, tool_router))
        print("✅ Task queued! Agent is free for new prompts.\n")
        return

    await execute_agent(user_prompt, all_tools, tool_router)

if __name__ == "__main__":
    user_input = (
        "When a new issue is created in my FlowMind repo, "
        "post a message to #ai-agent on Slack saying: "
        "'🚨 New issue created: [issue title] — check it out: [issue link]'"
    )
    asyncio.run(run_agent(user_input))
