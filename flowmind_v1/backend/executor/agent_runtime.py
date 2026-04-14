from __future__ import annotations

import asyncio
import json
import re
import uuid
from contextlib import AsyncExitStack
from typing import Any, Optional

from openai import OpenAI

from chat_store import save_chat
from config import (
    LLM_API_KEY,
    LLM_BASE_URL,
    LLM_ENABLE_THINKING,
    LLM_MAX_TOKENS,
    LLM_MODEL,
    LLM_REASONING_BUDGET,
    LLM_TEMPERATURE,
    LLM_TOP_P,
    MCP_SERVERS,
)
from executor.sse_stream import ExecutionStream, create_stream, get_stream, remove_stream
from gateway.webhook_queue import DeferredTask, TaskStatus, task_queue
from mcp_client.loader import load_all_servers
from log_service import write_log

# ─── System Prompts ──────────────────────────────────────────────

PLANNING_PROMPT = """You are FlowMind AI — a planning assistant connected to these tool servers:
- GitHub: repos, branches, issues, pull requests
- Slack: send messages and post to channels
- Jira: create and update tickets, sprints, projects
- Notion: read and write pages and databases
- PostgreSQL: query and manage database
- Linear: issues, cycles, projects
- Gmail: send and read emails
- Filesystem: read and write local files
- DuckDuckGo: search the web

Your job is to analyze the user's request and create an execution plan.

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format:
{
  "plan_summary": "Brief one-line summary of what you will do",
  "steps": [
    {
      "step": 1,
      "description": "What this step does",
      "server": "github",
      "tool": "tool_name_here",
      "args": {"arg1": "value1"},
      "depends_on": []
    }
  ]
}

Rules:
- Break multi-step tasks into logical order
- For cross-tool tasks: do the action first, then notify (Slack/email)
- For Slack #channel messages, add a first step to resolve channel_id via slack_list_channels
- Use exact tool names from the available tools list
- Each step's depends_on should list step numbers it depends on (empty array if independent)
- Be concise and specific with descriptions
- ONLY output JSON, no markdown fences, no explanation text
"""

EXECUTION_PROMPT = """You are FlowMind AI connected to these systems:
- GitHub: repos, branches, issues, pull requests
- Slack: send messages and post to channels
- Jira: create and update tickets, sprints, projects
- Notion: read and write pages and databases
- PostgreSQL: query and manage database
- Linear: issues, cycles, projects
- Gmail: send and read emails
- Filesystem: read and write local files
- DuckDuckGo: search the web

Rules:
- Break multi-step tasks into logical order.
- For cross-tool tasks, perform the action first and then notify.
- For Slack #channel messages, resolve channel id first and then post.
- Confirm what you did with specific links, ids, or names.
- If a tool fails, try an alternative approach.
- Be concise and action focused.
"""

SERVER_ICONS = {
    "github": "🐙",
    "slack": "💬",
    "jira": "🟠",
    "notion": "⚫",
    "postgres": "🐘",
    "linear": "🔵",
    "gmail": "📧",
    "filesystem": "📂",
    "duckduckgo": "🔍",
}

# ─── Runtime State ────────────────────────────────────────────────

_runtime_stack: Optional[AsyncExitStack] = None
_runtime_tools: list[dict[str, Any]] = []
_runtime_router: dict[str, tuple[Any, str]] = {}
_runtime_failed: list[str] = []
_runtime_lock = asyncio.Lock()
_client: Optional[OpenAI] = None

# In-memory plan store
_pending_plans: dict[str, dict[str, Any]] = {}


def _llm_extra_body() -> dict[str, Any]:
    return {
        "chat_template_kwargs": {"enable_thinking": LLM_ENABLE_THINKING},
        "reasoning_budget": LLM_REASONING_BUDGET,
    }


def _get_client() -> OpenAI:
    global _client
    if _client is not None:
        return _client
    if not LLM_API_KEY:
        raise RuntimeError("LLM_API_KEY is not configured")
    _client = OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY)
    return _client


# ─── Helpers ──────────────────────────────────────────────────────

def _extract_text_content(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str) and text:
                    chunks.append(text)
            else:
                text = getattr(item, "text", None)
                if isinstance(text, str) and text:
                    chunks.append(text)
        return "\n".join(chunks)
    return str(content)


def _format_tool_result(result: Any) -> str:
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


def _parse_plan_json(raw_text: str) -> dict[str, Any] | None:
    """Extract JSON plan from LLM response, handling markdown fences."""
    text = raw_text.strip()

    # Strip markdown fences
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 2 and lines[-1].strip() == "```":
            text = "\n".join(lines[1:-1]).strip()
        else:
            text = text.replace("```json", "").replace("```", "").strip()

    # Try direct parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "steps" in parsed:
            return parsed
    except json.JSONDecodeError:
        pass

    # Try extracting first JSON object
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        char = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                try:
                    parsed = json.loads(text[start:i + 1])
                    if isinstance(parsed, dict) and "steps" in parsed:
                        return parsed
                except json.JSONDecodeError:
                    pass
                break

    return None


# ─── Runtime Management ──────────────────────────────────────────

async def _ensure_runtime() -> tuple[list[dict[str, Any]], dict[str, tuple[Any, str]], list[str]]:
    global _runtime_stack, _runtime_tools, _runtime_router, _runtime_failed

    if _runtime_stack is not None:
        return _runtime_tools, _runtime_router, _runtime_failed

    async with _runtime_lock:
        if _runtime_stack is not None:
            return _runtime_tools, _runtime_router, _runtime_failed

        stack = AsyncExitStack()
        await stack.__aenter__()

        try:
            all_tools, tool_router, failed = await load_all_servers(stack, MCP_SERVERS)
        except BaseException:
            try:
                await asyncio.shield(stack.aclose())
            except Exception:
                pass
            raise

        _runtime_stack = stack
        _runtime_tools = all_tools
        _runtime_router = tool_router
        _runtime_failed = failed

    return _runtime_tools, _runtime_router, _runtime_failed


async def pre_initialize_runtime() -> None:
    """Call at startup to load all MCP servers eagerly."""
    try:
        all_tools, _, failed = await _ensure_runtime()
        server_count = len(MCP_SERVERS) - len(failed)
        await write_log("INFO", "agent", "runtime_initialized", {
            "tool_count": len(all_tools), "server_count": server_count, "failed_servers": failed,
        })
        print(f"\n{'='*55}")
        print(f"  ✅ {len(all_tools)} tools across {server_count} servers")
        if failed:
            print(f"  ⚠️  Skipped: {', '.join(failed)}")
        print(f"{'='*55}\n")
    except Exception as error:
        await write_log("ERROR", "agent", "runtime_init_failed", {"error": str(error)})
        print(f"\n❌ MCP runtime init failed: {error}\n")


async def shutdown_runtime() -> None:
    global _runtime_stack, _runtime_tools, _runtime_router, _runtime_failed, _client

    if _runtime_stack is None:
        return

    def _contains_cross_task_close_error(exc: BaseException) -> bool:
        if "Attempted to exit cancel scope in a different task" in str(exc):
            return True
        children = getattr(exc, "exceptions", None)
        if not children:
            return False
        return any(_contains_cross_task_close_error(child) for child in children)

    try:
        await _runtime_stack.aclose()
    except Exception as error:
        if not _contains_cross_task_close_error(error):
            raise
    finally:
        _runtime_stack = None
        _runtime_tools = []
        _runtime_router = {}
        _runtime_failed = []
        _client = None


# ─── Phase 1: Plan Generation ────────────────────────────────────

async def plan_agent(user_prompt: str) -> dict[str, Any]:
    """Generate an execution plan from the user prompt. Returns a plan with DAG steps."""
    all_tools, tool_router, failed = await _ensure_runtime()

    print(f"\n{'─'*55}")
    print(f"👤 You: {user_prompt}")
    print(f"{'─'*55}")
    print(f"📋 Generating plan...\n")

    await write_log("INFO", "agent", "plan_start", {"prompt": user_prompt[:200]})

    # Build tool descriptions for the planner
    tool_descriptions = []
    for tool in all_tools:
        func = tool.get("function", {})
        tool_descriptions.append(f"  - {func.get('name', '?')}: {func.get('description', '')[:100]}")
    tool_list_text = "\n".join(tool_descriptions)

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": PLANNING_PROMPT + f"\n\nAvailable tools:\n{tool_list_text}"},
        {"role": "user", "content": user_prompt},
    ]

    client = _get_client()
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=LLM_TEMPERATURE,
        top_p=LLM_TOP_P,
        max_tokens=LLM_MAX_TOKENS,
        stream=False,
        extra_body=_llm_extra_body(),
    )

    raw_response = _extract_text_content(getattr(response.choices[0].message, "content", ""))

    # Parse the plan
    plan_data = _parse_plan_json(raw_response)
    if not plan_data or not plan_data.get("steps"):
        await write_log("WARN", "agent", "plan_parse_failed", {"raw": raw_response[:500]})
        # Fallback: create a single-step plan
        plan_data = {
            "plan_summary": "Execute the request directly",
            "steps": [{"step": 1, "description": user_prompt, "server": "unknown", "tool": "auto", "args": {}, "depends_on": []}],
        }

    plan_id = str(uuid.uuid4())[:8]

    # Enrich steps with server icons
    for step in plan_data.get("steps", []):
        server = step.get("server", "unknown").lower()
        step["server_icon"] = SERVER_ICONS.get(server, "🔧")
        # Map tool to actual server if possible
        tool_name = step.get("tool", "")
        if tool_name in tool_router:
            _, actual_server = tool_router[tool_name]
            step["server"] = actual_server
            step["server_icon"] = SERVER_ICONS.get(actual_server, "🔧")

    plan = {
        "plan_id": plan_id,
        "prompt": user_prompt,
        "plan_summary": plan_data.get("plan_summary", ""),
        "steps": plan_data.get("steps", []),
        "step_count": len(plan_data.get("steps", [])),
        "failed_servers": failed,
        "status": "pending",
    }

    # Store for later execution
    _pending_plans[plan_id] = plan

    # Persist planned chat
    save_chat(
        prompt=user_prompt,
        plan=plan,
        result=None,
        status="planned",
        chat_id=plan_id,
        plan_id=plan_id,
    )

    # Print plan to terminal
    print(f"📋 Plan [{plan_id}]: {plan.get('plan_summary', '')}")
    for step in plan.get("steps", []):
        icon = step.get("server_icon", "🔧")
        print(f"   {icon} Step {step.get('step', '?')}: [{step.get('server', '?')}] → {step.get('tool', '?')}")
        print(f"      └─ {step.get('description', '')}")
    print(f"\n⏳ Waiting for approval...\n")

    await write_log("INFO", "agent", "plan_generated", {
        "plan_id": plan_id, "step_count": len(plan.get("steps", [])),
    })

    return plan


# ─── Phase 2: Execute Plan ───────────────────────────────────────

async def execute_plan(plan_id: str) -> dict[str, Any]:
    """Execute an approved plan. Streams events via SSE if a stream exists."""
    plan = _pending_plans.get(plan_id)
    if not plan:
        raise RuntimeError(f"Plan {plan_id} not found or expired")

    plan["status"] = "executing"
    save_chat(
        prompt=plan["prompt"],
        plan=plan,
        result=None,
        status="executing",
        chat_id=plan_id,
        plan_id=plan_id,
    )
    all_tools, tool_router, failed = await _ensure_runtime()

    # Get or create stream for this execution
    stream = await get_stream(plan_id)

    print(f"\n{'─'*55}")
    print(f"▶️  Executing plan [{plan_id}]")
    print(f"{'─'*55}\n")

    await write_log("INFO", "agent", "execute_start", {
        "plan_id": plan_id, "prompt": plan["prompt"][:200],
    })

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": EXECUTION_PROMPT},
        {"role": "user", "content": plan["prompt"]},
    ]

    steps_executed: list[dict[str, Any]] = []
    step_num = 1
    max_steps = 25

    try:
        while step_num <= max_steps:
            # Call LLM with tools
            client = _get_client()
            response = client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                tools=all_tools,
                tool_choice="auto",
                temperature=LLM_TEMPERATURE,
                top_p=LLM_TOP_P,
                max_tokens=LLM_MAX_TOKENS,
                stream=False,
                extra_body=_llm_extra_body(),
            )
            msg = response.choices[0].message
            tool_calls = getattr(msg, "tool_calls", None) or []

            if tool_calls:
                messages.append(msg.model_dump())
                for tool_call in tool_calls:
                    name = tool_call.function.name
                    raw_args = tool_call.function.arguments or "{}"
                    try:
                        args = json.loads(raw_args)
                        if not isinstance(args, dict):
                            args = {}
                    except Exception:
                        args = {}

                    session, server_name = tool_router.get(name, (None, "unknown"))
                    icon = SERVER_ICONS.get(server_name, "🔧")

                    # Terminal log
                    print(f"{icon} Step {step_num}: [{server_name}] → {name}")
                    print(f"   └─ Args: {json.dumps(args, indent=6)}")

                    await write_log("INFO", "agent", "tool_call", {
                        "plan_id": plan_id, "step": step_num, "server": server_name, "tool": name,
                    })

                    # Push SSE event
                    if stream:
                        stream.push_step_start(step_num, server_name, icon, name, args)

                    if not session:
                        result_text = f"Unknown tool: {name}"
                        print(f"   └─ ⚠️ {result_text}\n")
                        if stream:
                            stream.push_step_error(step_num, result_text)
                    else:
                        try:
                            result = await session.call_tool(name, args)
                            result_text = _format_tool_result(result)
                        except Exception as error:
                            detail = str(error).strip() or repr(error)
                            result_text = f"Tool error ({type(error).__name__}): {detail}"

                        print(f"   └─ Result: {result_text[:300]}\n")

                        if stream:
                            if result_text.startswith("Tool error") or result_text.startswith("Tool returned error"):
                                stream.push_step_error(step_num, result_text[:500])
                            else:
                                stream.push_step_complete(step_num, result_text[:500])

                    steps_executed.append({
                        "step": step_num,
                        "server": server_name,
                        "server_icon": icon,
                        "tool": name,
                        "args": args,
                        "result": result_text[:500],
                    })

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result_text,
                    })
                    step_num += 1
                    if step_num > max_steps:
                        break
                continue

            # No more tool calls — get the final summary with streaming
            assistant_text = _extract_text_content(getattr(msg, "content", "")).strip()

            # Stream the final summary
            print("🤖 FlowMind AI: ", end="", flush=True)

            try:
                summary_stream = client.chat.completions.create(
                    model=LLM_MODEL,
                    messages=messages[:-1] + [{"role": "user", "content": "Summarize what you just did concisely."}],
                    temperature=LLM_TEMPERATURE,
                    top_p=LLM_TOP_P,
                    max_tokens=2048,
                    stream=True,
                    extra_body=_llm_extra_body(),
                )

                summary_tokens: list[str] = []
                for chunk in summary_stream:
                    if getattr(chunk, "choices", None) and chunk.choices[0].delta.content is not None:
                        token = chunk.choices[0].delta.content
                        summary_tokens.append(token)
                        print(token, end="", flush=True)
                        if stream:
                            stream.push_token(token)

                print()  # newline after streaming
                final_summary = "".join(summary_tokens).strip()
                if not final_summary:
                    final_summary = assistant_text
            except Exception:
                final_summary = assistant_text
                print(final_summary)

            plan["status"] = "completed"

            result_payload = {
                "plan_id": plan_id,
                "assistant_response": final_summary,
                "steps": steps_executed,
                "tool_step_count": len(steps_executed),
            }
            save_chat(
                prompt=plan["prompt"],
                plan=plan,
                result=result_payload,
                status="completed",
                chat_id=plan_id,
                plan_id=plan_id,
            )

            await write_log("INFO", "agent", "execute_complete", {
                "plan_id": plan_id, "steps": len(steps_executed), "response_length": len(final_summary),
            })

            print(f"\n✅ Done — {len(steps_executed)} steps executed.\n")

            if stream:
                stream.finish(final_summary)

            return result_payload
    except Exception as error:
        plan["status"] = "failed"
        save_chat(
            prompt=plan["prompt"],
            plan=plan,
            result={"error": str(error), "steps": steps_executed},
            status="failed",
            chat_id=plan_id,
            plan_id=plan_id,
        )
        if stream:
            stream.finish_error(str(error))
        raise

    # Max steps hit
    plan["status"] = "completed"
    summary = "Stopped after reaching maximum tool steps."
    result_payload = {
        "plan_id": plan_id,
        "assistant_response": summary,
        "steps": steps_executed,
        "tool_step_count": len(steps_executed),
    }
    save_chat(
        prompt=plan["prompt"],
        plan=plan,
        result=result_payload,
        status="completed",
        chat_id=plan_id,
        plan_id=plan_id,
    )
    if stream:
        stream.finish(summary)

    return result_payload


# ─── Quick Agent (plan + execute in one call) ────────────────────

async def run_agent(user_prompt: str) -> dict[str, Any]:
    """Single-call mode: plan → execute immediately. Used by /api/agent/run."""
    all_tools, tool_router, failed = await _ensure_runtime()

    # Check webhook
    webhook_config = needs_webhook(user_prompt)
    if webhook_config:
        task = task_queue.create_task(
            user_prompt=user_prompt,
            webhook_type=webhook_config["webhook_type"],
            webhook_filter=webhook_config["webhook_filter"],
        )
        save_chat(
            prompt=user_prompt,
            plan={
                "task_id": task.task_id,
                "webhook_type": webhook_config["webhook_type"],
                "webhook_filter": webhook_config["webhook_filter"],
            },
            result={"queued": True},
            status="waiting",
            chat_id=task.task_id,
            plan_id=task.task_id,
        )
        asyncio.create_task(_handle_deferred_task(task))
        return {
            "queued": True,
            "task_id": task.task_id,
            "webhook_type": webhook_config["webhook_type"],
            "assistant_response": f"✅ Task queued! Waiting for {webhook_config['webhook_type']} event...",
            "steps": [],
            "tool_step_count": 0,
            "failed_servers": failed,
        }

    # Generate plan and execute immediately
    plan = await plan_agent(user_prompt)
    result = await execute_plan(plan["plan_id"])
    return {
        "queued": False,
        "failed_servers": failed,
        **result,
    }


# ─── Plan Store ───────────────────────────────────────────────────

def get_plan(plan_id: str) -> dict[str, Any] | None:
    return _pending_plans.get(plan_id)


def list_plans() -> list[dict[str, Any]]:
    return [
        {"plan_id": p["plan_id"], "prompt": p["prompt"][:100], "status": p["status"], "step_count": p["step_count"]}
        for p in _pending_plans.values()
    ]


# ─── Webhook Handling ─────────────────────────────────────────────

def needs_webhook(user_prompt: str) -> Optional[dict[str, Any]]:
    prompt_lower = user_prompt.lower()

    if any(p in prompt_lower for p in [
        "when a pr", "when pr", "if a pr", "when pull request",
        "if pull request", "when someone opens", "when pushed",
    ]):
        repo_match = re.search(r"(?:repo|repository)\s+['\"]?([\w][\w-]*)['\"]?", prompt_lower)
        repo = repo_match.group(1) if repo_match else "FlowMind"
        return {"webhook_type": "github_pr", "webhook_filter": {"repo": repo, "action": "opened"}}

    if any(p in prompt_lower for p in [
        "when a new issue", "when an issue", "when issue", "if an issue",
        "if a new issue", "issue is created", "issue is opened", "new issue",
    ]):
        repo_match = re.search(r"(?:repo|repository)\s+['\"]?([\w][\w-]*)['\"]?", prompt_lower)
        repo = repo_match.group(1) if repo_match else "FlowMind"
        return {"webhook_type": "github_issue", "webhook_filter": {"repo": repo, "action": "opened"}}

    if any(p in prompt_lower for p in ["when someone messages", "when a message", "when slack"]):
        return {"webhook_type": "slack_message", "webhook_filter": {}}

    return None


async def _handle_deferred_task(task: DeferredTask) -> None:
    await task.resume_event.wait()
    followup = (
        f"{task.user_prompt}\n\n"
        "The event you were waiting for just fired. Event data:\n"
        f"{json.dumps(task.event_data, indent=2)}\n\n"
        "Now complete the action you were supposed to take."
    )
    try:
        plan = await plan_agent(followup)
        execution_result = await execute_plan(plan["plan_id"])
        save_chat(
            prompt=task.user_prompt,
            plan={
                "task_id": task.task_id,
                "webhook_type": task.webhook_type,
                "webhook_filter": task.webhook_filter,
                "event_data": task.event_data,
                "followup_plan_id": plan["plan_id"],
            },
            result=execution_result,
            status="completed",
            chat_id=task.task_id,
            plan_id=task.task_id,
        )
        task.status = TaskStatus.DONE
    except Exception as error:
        save_chat(
            prompt=task.user_prompt,
            plan={
                "task_id": task.task_id,
                "webhook_type": task.webhook_type,
                "webhook_filter": task.webhook_filter,
                "event_data": task.event_data,
            },
            result={"error": str(error)},
            status="failed",
            chat_id=task.task_id,
            plan_id=task.task_id,
        )
        task.status = TaskStatus.FAILED


# ─── Status ──────────────────────────────────────────────────────

def runtime_status() -> dict[str, Any]:
    waiting = task_queue.get_waiting_tasks()
    return {
        "runtime_initialized": _runtime_stack is not None,
        "tool_count": len(_runtime_tools),
        "failed_servers": list(_runtime_failed),
        "waiting_task_count": len(waiting),
        "pending_plans": len(_pending_plans),
        "waiting_tasks": [
            {"id": t.task_id, "type": t.webhook_type, "status": t.status.value}
            for t in waiting
        ],
    }