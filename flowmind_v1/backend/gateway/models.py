from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class GenerateDAGRequest(BaseModel):
	natural_language: str = Field(..., min_length=10, max_length=500)
	available_connectors: list[str] = Field(..., min_length=1, max_length=10)


class StartExecutionRequest(BaseModel):
	workflow_id: str = Field(..., min_length=1, max_length=120)
	dag_json: dict[str, Any] = Field(default_factory=dict)


class ApproveRequest(BaseModel):
	step_id: str = Field(..., min_length=1, max_length=120)
	approved: bool


class ConnectRequest(BaseModel):
	user_id: str = Field(..., min_length=1, max_length=120)


class DisconnectRequest(BaseModel):
	user_id: str = Field(..., min_length=1, max_length=120)