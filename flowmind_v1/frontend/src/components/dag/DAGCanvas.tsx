import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { DAGNode } from './DAGNode';
import { DAGEdge } from './DAGEdge';

const nodeTypes = { customNode: DAGNode };
const edgeTypes = { customEdge: DAGEdge };

const initialNodes = [
  { id: '1', type: 'customNode', data: { label: 'Receive User Request', service: 'LLM Router', status: 'completed', confidence: 99 }, position: { x: 0, y: 0 } },
  { id: '2', type: 'customNode', data: { label: 'Fetch Jira Issues', service: 'Jira Connector', status: 'completed' }, position: { x: 0, y: 0 } },
  { id: '3', type: 'customNode', data: { label: 'Fetch PRs', service: 'GitHub Connector', status: 'running' }, position: { x: 0, y: 0 } },
  { id: '4', type: 'customNode', data: { label: 'Analyze Differences', service: 'LLM Agent', status: 'pending', confidence: 85 }, position: { x: 0, y: 0 } },
  { id: '5', type: 'customNode', data: { label: 'Update Jira Tickets', service: 'Jira Connector', status: 'pending' }, position: { x: 0, y: 0 } },
  { id: '6', type: 'customNode', data: { label: 'Send Slack Summary', service: 'Slack Connector', status: 'pending' }, position: { x: 0, y: 0 } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'customEdge', data: { label: 'extract params' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e1-3', source: '1', target: '3', type: 'customEdge', data: { label: 'extract params' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-4', source: '2', target: '4', type: 'customEdge', data: { label: 'issues[ ]' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-4', source: '3', target: '4', type: 'customEdge', data: { label: 'prs[ ]' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4-5', source: '4', target: '5', type: 'customEdge', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4-6', source: '4', target: '6', type: 'customEdge', markerEnd: { type: MarkerType.ArrowClosed } },
];

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 220;
  const nodeHeight = 100;

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'LR' ? 'left' : 'top';
    node.sourcePosition = direction === 'LR' ? 'right' : 'bottom';

    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { nodes, edges };
};

export function DAGCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );
    // @ts-ignore
    setNodes([...layoutedNodes]);
    // @ts-ignore
    setEdges([...layoutedEdges]);
  }, []);

  return (
    <div className="w-full h-full bg-background overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-card border-2 border-border px-3 py-1.5 shadow-2xs text-sm font-bold text-muted-foreground flex items-center gap-2">
        <div className="w-2 h-2 bg-primary animate-pulse" />
        Workflow Generated
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-muted/10"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} className="bg-background" />
        <Controls className="fill-foreground stroke-border bg-card border-border" />
      </ReactFlow>
    </div>
  );
}
