from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhooks/slack")
async def slack_webhook(request: Request):
    payload = await request.json()

    # Slack sends this ONE TIME to verify your URL
    if payload.get("type") == "url_verification":
        return {"challenge": payload.get("challenge")}

    return {"status": "ok"}

@app.post("/webhooks/github")
async def github_webhook(request: Request):
    payload = await request.json()
    return {"status": "received"}

@app.get("/health")
async def health():
    return {"status": "running"}