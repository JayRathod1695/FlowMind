from __future__ import annotations

import asyncio
from typing import Any

import gspread
from google.oauth2.credentials import Credentials
from gspread.worksheet import Worksheet

from planner.planner_models import DAGNode


def _parse_scopes(raw_scopes: Any) -> list[str] | None:
    if isinstance(raw_scopes, str):
        scopes = [scope.strip() for scope in raw_scopes.split(",") if scope.strip()]
        return scopes or None
    if isinstance(raw_scopes, list):
        scopes = [scope for scope in raw_scopes if isinstance(scope, str) and scope]
        return scopes or None
    return None


def _build_credentials(token: dict[str, Any]) -> Credentials:
    access_token = token.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise RuntimeError("Google Sheets access_token is required")

    return Credentials(
        token=access_token,
        refresh_token=token.get("refresh_token"),
        token_uri=token.get("token_uri"),
        client_id=token.get("client_id"),
        client_secret=token.get("client_secret"),
        scopes=_parse_scopes(token.get("scopes")),
    )


def _open_worksheet(
    gspread_client: gspread.Client,
    spreadsheet_id: str,
    worksheet_name: str,
) -> Worksheet:
    spreadsheet = gspread_client.open_by_key(spreadsheet_id)
    return spreadsheet.worksheet(worksheet_name)


def append_row(worksheet: Worksheet, values: list[Any]) -> None:
    worksheet.append_row(values)


def read_range(worksheet: Worksheet, range_str: str) -> list[list[Any]]:
    return worksheet.get(range_str)


def update_cell(worksheet: Worksheet, cell: str, value: str) -> None:
    worksheet.update_acell(cell, value)


async def execute_tool(step: DAGNode, token: dict[str, Any]) -> dict[str, Any]:
    try:
        credentials = await asyncio.to_thread(_build_credentials, token)
        gspread_client = await asyncio.to_thread(gspread.authorize, credentials)

        spreadsheet_id = step.input.get("spreadsheet_id")
        worksheet_name = step.input.get("worksheet")

        if not isinstance(spreadsheet_id, str) or not spreadsheet_id:
            raise RuntimeError("Sheets tools require input.spreadsheet_id")
        if not isinstance(worksheet_name, str) or not worksheet_name:
            raise RuntimeError("Sheets tools require input.worksheet")

        worksheet = await asyncio.to_thread(
            _open_worksheet,
            gspread_client,
            spreadsheet_id,
            worksheet_name,
        )

        tool_name = step.tool_name.strip().lower()
        if tool_name == "append_row":
            values = step.input.get("values")
            if not isinstance(values, list):
                raise RuntimeError("Sheets append_row requires list input.values")
            await asyncio.to_thread(append_row, worksheet, values)
            data: dict[str, Any] = {"updated": True}
        elif tool_name == "read_range":
            range_str = step.input.get("range")
            if not isinstance(range_str, str) or not range_str:
                raise RuntimeError("Sheets read_range requires input.range")
            values = await asyncio.to_thread(read_range, worksheet, range_str)
            data = {"values": values}
        elif tool_name == "update_cell":
            cell = step.input.get("cell")
            value = step.input.get("value")
            if not isinstance(cell, str) or not cell:
                raise RuntimeError("Sheets update_cell requires input.cell")
            if not isinstance(value, str):
                raise RuntimeError("Sheets update_cell requires string input.value")
            await asyncio.to_thread(update_cell, worksheet, cell, value)
            data = {"updated": True, "cell": cell}
        else:
            raise RuntimeError(f"Unsupported Sheets tool: {step.tool_name}")

        return {
            "status": "ok",
            "connector": "sheets",
            "tool_name": step.tool_name,
            "data": data,
        }
    except Exception as error:
        raise RuntimeError(f"Sheets connector failed: {error}") from error