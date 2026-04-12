import asyncio
import json
import os
from contextlib import AsyncExitStack
from pathlib import Path

from openai import OpenAI
from dotenv import load_dotenv
from config import MCP_SERVERS
from mcp_loader import load_all_servers

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


LLM_API_KEY = _env("LLM_API_KEY") or _env("OPENAI_API_KEY")
LLM_BASE_URL = _env("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
MODEL = _env("LLM_MODEL", "deepseek-ai/deepseek-v3.1-terminus")

client = OpenAI(
    base_url=LLM_BASE_URL,
    api_key=LLM_API_KEY or "missing",
)

# ── System prompt — knows ALL 9 tools ─────────────────────────────
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
- Always confirm what you did with specifics (links, IDs, names)
- If a tool fails, try an alternative approach
- Be concise and action-focused"""

def ask_llm(messages, tools):
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

def stream_final_response(messages):
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

# Server name → emoji for clean logs
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

async def run_agent(user_prompt: str):
    print("\n" + "="*55)
    print("  🚀 FlowMind AI Agent Starting...")
    print("="*55)
    print("📦 Loading MCP servers...\n")

    if not LLM_API_KEY:
        print("❌ Missing LLM_API_KEY (or OPENAI_API_KEY) in backend/.env")
        return

    async with AsyncExitStack() as stack:
        all_tools, tool_router, failed = await load_all_servers(stack, MCP_SERVERS)

        print(f"\n{'='*55}")
        print(f"  ✅ {len(all_tools)} total tools loaded across {len(MCP_SERVERS) - len(failed)} servers")
        if failed:
            print(f"  ⚠️  Skipped: {', '.join(failed)}")
        print(f"{'='*55}\n")

        if not all_tools:
            print("❌ No tools loaded. Check your tokens.")
            return

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt},
        ]
        print(f"👤 You: {user_prompt}\n")

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
                        result_text = result.content[0].text if result.content else "Done"
                    except Exception as e:
                        result_text = f"Tool error: {str(e)}"

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

# ── Demo prompts — try these! ──────────────────────────────────────
if __name__ == "__main__":

    # 🔥 Cross-tool killer demo for hackathon judges:
    user_input = (
        "Search the web for the latest trends in AI agents, "
        "create a GitHub issue in my FlowMind repo summarizing the findings, "
        "create a Jira ticket for the team to research this, "
        "and post a summary to #ai-agent on Slack."
    )

    asyncio.run(run_agent(user_input))
