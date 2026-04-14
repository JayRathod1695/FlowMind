from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from duckduckgo_search import DDGS
from mcp.server.fastmcp import FastMCP

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

mcp = FastMCP("duckduckgo")


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(value, high))


@mcp.tool()
def duckduckgo_web_search(query: str, max_results: int = 5):
    limit = _clamp(max_results, 1, 25)
    with DDGS() as ddgs:
        rows = list(ddgs.text(query, max_results=limit))

    return [
        {
            "title": row.get("title", ""),
            "url": row.get("href", ""),
            "snippet": row.get("body", ""),
        }
        for row in rows
    ]


@mcp.tool()
def duckduckgo_news_search(query: str, max_results: int = 5):
    limit = _clamp(max_results, 1, 25)
    with DDGS() as ddgs:
        rows = list(ddgs.news(query, max_results=limit))

    return [
        {
            "title": row.get("title", ""),
            "url": row.get("url", ""),
            "date": row.get("date", ""),
            "source": row.get("source", ""),
            "snippet": row.get("body", ""),
        }
        for row in rows
    ]


if __name__ == "__main__":
    mcp.run(transport="stdio")
