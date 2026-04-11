from __future__ import annotations

from typing import Any

from executor.executor_graph import topological_sort
from executor.executor_runner import run_step
from executor.executor_service_helpers import (
    approve_pending_step,
    broadcast_event,
    create_active_execution,
    get_in_memory_execution_status,
    mark_execution_state,
    parse_dag,
    set_current_step,
)
from executor.executor_service_storage import (
    get_database_execution_status,
    insert_execution_row,
    record_not_approved_step,
    update_execution_row_status,
)
from executor.executor_service_helpers import wait_for_approval
from log_service import write_log


async def register_execution(
    workflow_id: str,
    dag_json: dict[str, Any],
    user_id: str,
    execution_id: str,
) -> None:
    nodes, edges = parse_dag(dag_json)
    topological_sort(nodes, edges)
    await insert_execution_row(workflow_id, dag_json, execution_id)
    await create_active_execution(execution_id, workflow_id, user_id)


async def execute_dag(
    workflow_id: str,
    dag_json: dict[str, Any],
    user_id: str,
    execution_id: str,
) -> None:
    await write_log(
        "INFO",
        "executor",
        "execution_started",
        {"workflow_id": workflow_id, "execution_id": execution_id, "user_id": user_id},
        execution_id=execution_id,
    )

    try:
        nodes, edges = parse_dag(dag_json)
        layers = topological_sort(nodes, edges)

        for layer in layers:
            for step in layer:
                await set_current_step(execution_id, step.id)

                if step.requires_approval:
                    await broadcast_event(
                        {
                            "type": "approval_required",
                            "execution_id": execution_id,
                            "workflow_id": workflow_id,
                            "step_id": step.id,
                        }
                    )
                    approved = await wait_for_approval(execution_id, step.id)
                    if not approved:
                        await record_not_approved_step(execution_id, step)
                        await broadcast_event(
                            {
                                "type": "step_status",
                                "execution_id": execution_id,
                                "step_id": step.id,
                                "status": "failed",
                                "error_message": "Step was not approved",
                            }
                        )
                        raise RuntimeError(f"Step {step.id} was not approved")

                await broadcast_event(
                    {
                        "type": "step_status",
                        "execution_id": execution_id,
                        "step_id": step.id,
                        "status": "running",
                    }
                )
                step_result = await run_step(step, user_id, execution_id)
                await broadcast_event(
                    {
                        "type": "step_status",
                        "execution_id": execution_id,
                        "step_id": step.id,
                        "status": step_result.status,
                        "duration_ms": step_result.duration_ms,
                    }
                )

        await update_execution_row_status(execution_id, "completed")
        await mark_execution_state(execution_id, "completed")
        await broadcast_event(
            {
                "type": "execution_complete",
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "status": "completed",
            }
        )
    except Exception as error:
        await update_execution_row_status(execution_id, "failed")
        await mark_execution_state(execution_id, "failed", str(error))

        await write_log(
            "ERROR",
            "executor",
            "execution_failed",
            {
                "workflow_id": workflow_id,
                "execution_id": execution_id,
                "error_type": type(error).__name__,
                "message": str(error),
            },
            execution_id=execution_id,
        )
        await broadcast_event(
            {
                "type": "execution_complete",
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "status": "failed",
                "error_message": str(error),
            }
        )


async def approve_step(execution_id: str, step_id: str, approved: bool) -> bool:
    return await approve_pending_step(execution_id, step_id, approved)


async def get_execution_status(execution_id: str) -> dict[str, Any] | None:
    in_memory_status = await get_in_memory_execution_status(execution_id)
    if in_memory_status is not None:
        return in_memory_status
    return await get_database_execution_status(execution_id)