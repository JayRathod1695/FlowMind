from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AgentRunRequest(BaseModel):
	prompt: str = Field(..., min_length=1, max_length=4000)


class ConversationStartRequest(BaseModel):
	prompt: str = Field(..., min_length=1, max_length=4000)


class ConversationMessageRequest(BaseModel):
	message: str = Field(..., min_length=1, max_length=4000)


class ConversationMessage(BaseModel):
	id: str
	conversation_id: str
	turn_index: int
	role: str
	content: str
	metadata: dict[str, Any] = Field(default_factory=dict)
	created_at: str


class ConversationSession(BaseModel):
	id: str
	initial_prompt: str
	state: str
	assistant_message: str | None = None
	plan_id: str | None = None
	plan_json: dict[str, Any] | None = None
	result_json: dict[str, Any] | None = None
	can_proceed: bool = False
	missing_info: list[str] = Field(default_factory=list)
	planning_prompt: str | None = None
	created_at: str
	updated_at: str
	completed_at: str | None = None
	messages: list[ConversationMessage] = Field(default_factory=list)


class ConversationTurnResponse(BaseModel):
	conversation: ConversationSession
	assistant_message: str
	can_proceed: bool
	missing_info: list[str] = Field(default_factory=list)
	plan_id: str | None = None
	plan: dict[str, Any] | None = None


class FrontendLogRequest(BaseModel):
	event: str = Field(..., min_length=1, max_length=120)
	metadata: dict = Field(default_factory=dict)
	timestamp: str | None = None