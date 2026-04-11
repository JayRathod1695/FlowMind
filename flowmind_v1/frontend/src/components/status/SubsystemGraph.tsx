import {
  Background,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const nodes: Node[] = [
  {
    id: 'planner',
    position: { x: 0, y: 30 },
    data: { label: 'LLM Planner' },
    style: { width: 160, borderRadius: 12, border: '1px solid #AFAFAF', padding: 10, background: '#FFFFFF', color: '#000000', fontWeight: 600 },
  },
  {
    id: 'executor',
    position: { x: 210, y: 30 },
    data: { label: 'DAG Executor' },
    style: { width: 170, borderRadius: 12, border: '1px solid #007AFF', padding: 10, background: 'rgba(0,122,255,0.12)', color: '#000000', fontWeight: 600 },
  },
  {
    id: 'router',
    position: { x: 440, y: 30 },
    data: { label: 'MCP Router' },
    style: { width: 160, borderRadius: 12, border: '1px solid #16A34A', padding: 10, background: 'rgba(22,163,74,0.12)', color: '#000000', fontWeight: 600 },
  },
  {
    id: 'log',
    position: { x: 240, y: 146 },
    data: { label: 'Log Service' },
    style: { width: 160, borderRadius: 12, border: '1px solid #D97706', padding: 10, background: 'rgba(217,119,6,0.12)', color: '#000000', fontWeight: 600 },
  },
]

const edges: Edge[] = [
  { id: 'planner-executor', source: 'planner', target: 'executor', markerEnd: { type: MarkerType.ArrowClosed, color: '#007AFF' }, style: { stroke: '#007AFF', strokeWidth: 1.6 } },
  { id: 'executor-router', source: 'executor', target: 'router', markerEnd: { type: MarkerType.ArrowClosed, color: '#007AFF' }, style: { stroke: '#007AFF', strokeWidth: 1.6 } },
  { id: 'executor-log', source: 'executor', target: 'log', markerEnd: { type: MarkerType.ArrowClosed, color: '#007AFF' }, style: { stroke: '#007AFF', strokeWidth: 1.6 } },
  { id: 'router-log', source: 'router', target: 'log', markerEnd: { type: MarkerType.ArrowClosed, color: '#007AFF' }, style: { stroke: '#007AFF', strokeWidth: 1.6 } },
]

function SubsystemGraph() {
  return (
    <section className="space-y-3 rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#000000]">Subsystem Graph</h2>
        <span className="text-xs text-[#1F1F1F]">Read-only topology</span>
      </div>
      <div className="h-[260px] rounded-xl border border-[#AFAFAF] bg-[#FFFFFF]">
        <ReactFlow
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodes={nodes}
          edges={edges}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#AFAFAF" gap={22} size={1} />
        </ReactFlow>
      </div>
    </section>
  )
}

export default SubsystemGraph