import { useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import DAGEdge from '@/components/dag/DAGEdge'
import DAGNode from '@/components/dag/DAGNode'
import {
  layoutDAG,
  type DAGCanvasNode,
  type DAGCanvasNodeData,
  type DAGNodeStatus,
} from '@/components/dag/DAGCanvas.layout'
import { useExecutionStore } from '@/store/execution.store'
import { useWorkflowStore } from '@/store/workflow.store'
import type { StepStatus } from '@/types/execution.types'

const nodeTypes: NodeTypes = {
  dagNode: DAGNode,
}

const edgeTypes = {
  dagEdge: DAGEdge,
} satisfies EdgeTypes

const toDisplayStatus = (status?: StepStatus): DAGNodeStatus => {
  if (status === 'running') {
    return 'running'
  }

  if (status === 'failed') {
    return 'failed'
  }

  if (status === 'completed') {
    return 'success'
  }

  return 'pending'
}

function DAGViewport() {
  const workflowNodes = useWorkflowStore((state) => state.generatedDAG ?? [])
  const workflowEdges = useWorkflowStore((state) => state.generatedEdges ?? [])
  const workflowConfidence = useWorkflowStore((state) => state.workflowConfidence ?? 0)
  const stepStatuses = useExecutionStore((state) => state.stepStatuses)

  const layout = useMemo(
    () => layoutDAG(workflowNodes, workflowEdges),
    [workflowNodes, workflowEdges],
  )

  const nodes = useMemo(
    () =>
      layout.nodes.map((node): DAGCanvasNode => ({
        ...node,
        data: {
          ...(node.data as DAGCanvasNodeData),
          confidence: workflowConfidence,
          status: toDisplayStatus(stepStatuses[node.id]),
        },
      })),
    [layout.nodes, stepStatuses, workflowConfidence],
  )

  const edges = useMemo(
    () =>
      layout.edges.map((edge) => ({
        ...edge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#007AFF',
        },
      })),
    [layout.edges],
  )

  if (nodes.length === 0) {
    return (
      <div className="grid h-[480px] place-items-center rounded-xl border border-dashed border-[#AFAFAF] bg-[#6F6F6F] px-6 text-center text-sm text-[#E5E5E5]">
        DAG is empty. Generate a workflow first to visualize the execution graph.
      </div>
    )
  }

  return (
    <div className="h-[480px] rounded-xl border border-[#AFAFAF] bg-[#6F6F6F] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
      <ReactFlow<DAGCanvasNode>
        edges={edges}
        edgeTypes={edgeTypes}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        nodeTypes={nodeTypes}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        panOnDrag
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          zoomable
          pannable
          nodeColor="#E5E5E5"
          nodeStrokeColor="#007AFF"
          maskColor="rgba(0, 0, 0, 0.25)"
          nodeStrokeWidth={3}
        />
        <Controls position="bottom-right" />
        <Background color="#AFAFAF" gap={24} size={1} />
      </ReactFlow>
    </div>
  )
}

function DAGCanvas() {
  return (
    <ReactFlowProvider>
      <DAGViewport />
    </ReactFlowProvider>
  )
}

export default DAGCanvas
