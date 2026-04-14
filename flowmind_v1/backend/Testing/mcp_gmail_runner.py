from pathlib import Path

from dotenv import load_dotenv
from mcp_gmail.server import mcp

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


if __name__ == "__main__":
    mcp.run(transport="stdio")
