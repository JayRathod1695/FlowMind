from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DAGNode(BaseModel):
    id: str = Field(..., min_length=1, max_length=120)
    connector: str = Field(..., min_length=1, max_length=40)
    tool_name: str = Field(..., min_length=1, max_length=120)
    input: dict[str, Any] = Field(default_factory=dict)


class DAGEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_node: str = Field(..., alias="from", min_length=1, max_length=120)
    to: str = Field(..., min_length=1, max_length=120)


class ConfidenceScore(BaseModel):
    overall: float = Field(..., ge=0.0, le=1.0)
    rationale: str = Field(..., min_length=1, max_length=500)


class PlannerWarning(BaseModel):
    code: str = Field(..., min_length=1, max_length=80)
    message: str = Field(..., min_length=1, max_length=500)


class DAGPlannerResult(BaseModel):
    nodes: list[DAGNode] = Field(..., min_length=1, max_length=25)
    edges: list[DAGEdge] = Field(default_factory=list)
    confidence: ConfidenceScore
    warnings: list[PlannerWarning] = Field(default_factory=list)
