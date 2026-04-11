import dagre from '@dagrejs/dagre'
import type { Edge as XYEdge, Node as XYNode } from '@xyflow/react'

import type { DAGEdge, DAGNode } from '@/types/workflow.types'

export type DAGNodeStatus = 'pending' | 'running' | 'success' | 'failed'

export interface DAGCanvasNodeData extends Record<string, unknown> {
  connector: string
  toolName: string
  confidence: number
  status: DAGNodeStatus
}

export type DAGCanvasNode = XYNode<DAGCanvasNodeData, 'dagNode'>

const NODE_WIDTH = 260
const NODE_HEIGHT = 116

export const layoutDAG = (
  nodes: DAGNode[],
  edges: DAGEdge[],
): { nodes: DAGCanvasNode[]; edges: XYEdge[] } => {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: 'LR',
    nodesep: 40,
    ranksep: 88,
    marginx: 18,
    marginy: 18,
  })

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const edge of edges) {
    graph.setEdge(edge.from, edge.to)
  }

  dagre.layout(graph)

  const positionedNodes: DAGCanvasNode[] = nodes.map((node) => {
    const graphNode = graph.node(node.id) as { x: number; y: number }

    return {
      id: node.id,
      type: 'dagNode',
      position: {
        x: graphNode.x - NODE_WIDTH / 2,
        y: graphNode.y - NODE_HEIGHT / 2,
      },
      data: {
        connector: node.connector,
        toolName: node.tool_name,
        confidence: 0,
        status: 'pending',
      },
      draggable: false,
      selectable: false,
    }
  })

  const positionedEdges: XYEdge[] = edges.map((edge, index) => ({
    id: `${edge.from}->${edge.to}-${index}`,
    source: edge.from,
    target: edge.to,
    type: 'dagEdge',
    animated: true,
  }))

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
  }
}
