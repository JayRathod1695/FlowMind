import asyncio
import uvicorn
from webhook_server import app
from github_agent import run_agent, shutdown_runtime

async def main():
    # Start webhook server — keeps process alive
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="warning")
    server = uvicorn.Server(config)

    # Start webhook server as background task
    asyncio.create_task(server.serve())

    print("\n🌐 Webhook server running!")
    print("   GitHub → POST https://ogle-roaming-praying.ngrok-free.dev/webhooks/github")
    print("   Slack  → POST https://ogle-roaming-praying.ngrok-free.dev/webhooks/slack")
    print("   Health → GET  http://localhost:8000/health\n")

    # Register your deferred task
    await run_agent(
        "When a new issue is created in my FlowMind repo, "
        "post a message to #ai-agent on Slack saying: "
        "'🚨 New issue created: [issue title] — check it out: [issue link]'"
    )

    # ✅ Keep process alive forever — waiting for webhooks
    print("\n⏳ Agent is waiting for events... Press Ctrl+C to stop\n")
    try:
        await asyncio.Event().wait()   # blocks forever until Ctrl+C
    finally:
        await shutdown_runtime()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 FlowMind stopped.")