from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from pydantic import Field, ValidationError

from log_service import broadcast
from planner.planner_models import DAGEdge, DAGNode


class ExecutorNode(DAGNode):
    requires_approval: bool = False
    max_attempts: int = Field(default=3, ge=1, le=5)


@dataclass(slots=True)
class PendingApprovalState:
    approval_event: asyncio.Event
    approved: bool | None = None


@dataclass(slots=True)
class ActiveExecutionState:
    workflow_id: str
    user_id: str
    status: str
    started_at: str
    current_step_id: str | None = None
    completed_at: str | None = None
    error_message: str | None = None
    pending_approvals: dict[str, PendingApprovalState] = field(default_factory=dict)


ACTIVE_EXECUTIONS: dict[str, ActiveExecutionState] = {}
ACTIVE_EXECUTIONS_LOCK = asyncio.Lock()


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def parse_dag(dag_json: dict[str, Any]) -> tuple[list[ExecutorNode], list[DAGEdge]]:
    try:
        raw_nodes = dag_json.get("nodes", [])
        raw_edges = dag_json.get("edges", [])
        nodes = [ExecutorNode.model_validate(node) for node in raw_nodes]
        edges = [DAGEdge.model_validate(edge) for edge in raw_edges]
        if not nodes:
            raise ValueError("DAG must contain at least one node")
        return nodes, edges
    except ValidationError as error:
        raise ValueError(f"Invalid DAG format: {error}") from error


async def broadcast_event(event_payload: dict[str, Any]) -> None:
    try:
        await broadcast(event_payload)
    except Exception:
        pass


async def create_active_execution(
    execution_id: str,
    workflow_id: str,
    user_id: str,
) -> None:
    async with ACTIVE_EXECUTIONS_LOCK:
        ACTIVE_EXECUTIONS[execution_id] = ActiveExecutionState(
            workflow_id=workflow_id,
            user_id=user_id,
            status="running",
            started_at=utc_timestamp(),
        )


async def set_current_step(execution_id: str, step_id: str | None) -> None:
    async with ACTIVE_EXECUTIONS_LOCK:
        state = ACTIVE_EXECUTIONS.get(execution_id)
        if state is not None:
            state.current_step_id = step_id


async def mark_execution_state(
    execution_id: str,
    status: str,
    error_message: str | None = None,
) -> None:
    async with ACTIVE_EXECUTIONS_LOCK:
        state = ACTIVE_EXECUTIONS.get(execution_id)
        if state is None:
            return
        state.status = status
        state.current_step_id = None
        state.completed_at = utc_timestamp()
        state.error_message = error_message


async def wait_for_approval(execution_id: str, step_id: str) -> bool:
    pending_approval = PendingApprovalState(approval_event=asyncio.Event())

    async with ACTIVE_EXECUTIONS_LOCK:
        state = ACTIVE_EXECUTIONS.get(execution_id)
        if state is None:
            return False
        state.pending_approvals[step_id] = pending_approval

    await pending_approval.approval_event.wait()

    async with ACTIVE_EXECUTIONS_LOCK:
        state = ACTIVE_EXECUTIONS.get(execution_id)
        if state is None:
            return False
        pending_state = state.pending_approvals.pop(step_id, None)
        if pending_state is None:
            return False
        return bool(pending_state.approved)


async def approve_pending_step(execution_id: str, step_id: str, approved: bool) -> bool:
    async with ACTIVE_EXECUTIONS_LOCK:
        state = ACTIVE_EXECUTIONS.get(execution_id)
        if state is None:
            return False
        pending_state = state.pending_approvals.get(step_id)
        if pending_state is None:
            return False
        pending_state.approved = approved
        pending_state.approval_event.set()
        return True


async def get_in_memory_execution_status(
    execution_id: str,
) -> dict[str, Any] | None:
    async with ACTIVE_EXECUTIONS_LOCK:
        state = ACTIVE_EXECUTIONS.get(execution_id)
        if state is None:
            return None
        return {
            "execution_id": execution_id,
            "workflow_id": state.workflow_id,
            "status": state.status,
            "current_step": state.current_step_id,
            "pending_approval_steps": sorted(state.pending_approvals.keys()),
            "error_message": state.error_message,
            "started_at": state.started_at,
            "completed_at": state.completed_at,
        }