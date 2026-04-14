import base64
from email.mime.text import MIMEText
import os
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from mcp.server.fastmcp import FastMCP

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
]

_USER_ID = "me"
_SERVICE = None

mcp = FastMCP("gmail")


def _credentials_path() -> Path:
    raw = os.getenv("GMAIL_CREDENTIALS_PATH", "").strip()
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parents[1] / "gmail_credentials.json"


def _token_path() -> Path:
    raw = os.getenv("GMAIL_TOKEN_PATH", "").strip()
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parents[1] / "token.json"


def _load_credentials() -> Credentials:
    token_path = _token_path()
    credentials_path = _credentials_path()

    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

    if not creds or not creds.valid:
        if not credentials_path.exists():
            raise FileNotFoundError(
                f"Gmail credentials file not found at {credentials_path}. "
                "Set GMAIL_CREDENTIALS_PATH in backend/.env."
            )
        flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), SCOPES)
        creds = flow.run_local_server(port=0)
        token_path.parent.mkdir(parents=True, exist_ok=True)
        token_path.write_text(creds.to_json(), encoding="utf-8")

    return creds


def _service():
    global _SERVICE
    if _SERVICE is None:
        creds = _load_credentials()
        _SERVICE = build("gmail", "v1", credentials=creds, cache_discovery=False)
    return _SERVICE


def _header_value(headers: List[Dict[str, str]], name: str) -> str:
    target = name.lower()
    for header in headers:
        if header.get("name", "").lower() == target:
            return header.get("value", "")
    return ""


def _encode_message(to: str, subject: str, body: str, in_reply_to: str = "", references: str = "") -> str:
    message = MIMEText(body)
    message["To"] = to
    message["Subject"] = subject
    if in_reply_to:
        message["In-Reply-To"] = in_reply_to
    if references:
        message["References"] = references
    return base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")


@mcp.tool()
def gmail_list_messages(query: str = "", max_results: int = 10):
    svc = _service()
    response = svc.users().messages().list(
        userId=_USER_ID,
        q=query,
        maxResults=max(1, min(max_results, 50)),
    ).execute()

    results: List[Dict[str, Any]] = []
    for item in response.get("messages", []):
        msg_id = item.get("id", "")
        details = svc.users().messages().get(
            userId=_USER_ID,
            id=msg_id,
            format="metadata",
            metadataHeaders=["From", "Subject", "Date"],
        ).execute()

        headers = details.get("payload", {}).get("headers", [])
        results.append(
            {
                "id": msg_id,
                "thread_id": details.get("threadId", ""),
                "from": _header_value(headers, "From"),
                "subject": _header_value(headers, "Subject"),
                "date": _header_value(headers, "Date"),
                "snippet": details.get("snippet", ""),
            }
        )

    return results


@mcp.tool()
def gmail_get_todays_messages(max_results: int = 10):
    return gmail_list_messages(query="newer_than:1d", max_results=max_results)


@mcp.tool()
def gmail_send_message(to: str, subject: str, body: str):
    svc = _service()
    raw = _encode_message(to=to, subject=subject, body=body)
    sent = svc.users().messages().send(userId=_USER_ID, body={"raw": raw}).execute()
    return {
        "message_id": sent.get("id", ""),
        "thread_id": sent.get("threadId", ""),
        "status": "sent",
    }


@mcp.tool()
def gmail_reply_to_message(message_id: str, body: str):
    svc = _service()
    original = svc.users().messages().get(
        userId=_USER_ID,
        id=message_id,
        format="metadata",
        metadataHeaders=["From", "Reply-To", "Subject", "Message-Id"],
    ).execute()

    headers = original.get("payload", {}).get("headers", [])
    recipient = _header_value(headers, "Reply-To") or _header_value(headers, "From")
    subject = _header_value(headers, "Subject")
    message_id_header = _header_value(headers, "Message-Id")
    thread_id = original.get("threadId", "")

    if subject and not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"
    elif not subject:
        subject = "Re: (no subject)"

    raw = _encode_message(
        to=recipient,
        subject=subject,
        body=body,
        in_reply_to=message_id_header,
        references=message_id_header,
    )

    sent = svc.users().messages().send(
        userId=_USER_ID,
        body={"raw": raw, "threadId": thread_id},
    ).execute()

    return {
        "message_id": sent.get("id", ""),
        "thread_id": sent.get("threadId", ""),
        "status": "replied",
    }


if __name__ == "__main__":
    mcp.run(transport="stdio")
