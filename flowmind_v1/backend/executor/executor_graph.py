from __future__ import annotations

from planner.planner_models import DAGEdge, DAGNode


def topological_sort(
    nodes: list[DAGNode],
    edges: list[DAGEdge],
) -> list[list[DAGNode]]:
    """Return DAG nodes grouped into execution layers.

    Nodes in the same layer can run in parallel in future phases.
    """
    node_by_id: dict[str, DAGNode] = {}
    for node in nodes:
        if node.id in node_by_id:
            raise ValueError(f"Duplicate node id: {node.id}")
        node_by_id[node.id] = node

    if not node_by_id:
        return []

    incoming_edge_count = {node_id: 0 for node_id in node_by_id}
    outgoing_edges = {node_id: [] for node_id in node_by_id}

    for edge in edges:
        source_node_id = edge.from_node
        target_node_id = edge.to
        if source_node_id not in node_by_id:
            raise ValueError(f"Unknown edge source node: {source_node_id}")
        if target_node_id not in node_by_id:
            raise ValueError(f"Unknown edge target node: {target_node_id}")
        outgoing_edges[source_node_id].append(target_node_id)
        incoming_edge_count[target_node_id] += 1

    current_layer = sorted(
        node_id
        for node_id, dependency_count in incoming_edge_count.items()
        if dependency_count == 0
    )
    ordered_layers: list[list[DAGNode]] = []
    visited_count = 0

    while current_layer:
        ordered_layers.append([node_by_id[node_id] for node_id in current_layer])
        next_layer_candidates: list[str] = []

        for node_id in current_layer:
            visited_count += 1
            for downstream_node_id in outgoing_edges[node_id]:
                incoming_edge_count[downstream_node_id] -= 1
                if incoming_edge_count[downstream_node_id] == 0:
                    next_layer_candidates.append(downstream_node_id)

        current_layer = sorted(next_layer_candidates)

    if visited_count != len(node_by_id):
        raise ValueError("DAG contains a cycle.")

    return ordered_layers