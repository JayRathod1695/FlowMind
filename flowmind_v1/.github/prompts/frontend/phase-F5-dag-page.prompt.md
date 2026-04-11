agent: agent

# Phase F5 — DAG Page

Use @frontend-agent for this phase.
Reference `.github/skills/frontend-patterns/` for React patterns.

## Goal
Build the complete DAG visualization page using @xyflow/react v12 + @dagrejs/dagre.
Custom nodes show connector icon, step name, confidence badge, and status ring.

## Deliverables

### `src/components/dag/DAGCanvas.layout.ts` (pure function, no JSX):
```ts
// layoutDAG(nodes: DAGNode[], edges: DAGEdge[]): { nodes: XYNode[], edges: XYEdge[] }
// 1. Create dagre.graphlib.Graph
// 2. Set graph direction: 'LR' (left to right)
// 3. Add nodes with width/height
// 4. Add edges
// 5. dagre.layout(graph)
// 6. Map back to @xyflow/react node format with position: { x, y }
// Pure function — memoized with useMemo in DAGCanvas
```

### `src/components/dag/DAGNode.tsx` (max 120 lines):
Custom React Flow node component:
- Connector icon (use lucide-react icon matching connector name)
- Step name
- ConfidenceBadge (score + risk level)
- Status ring: pending=grey, running=blue pulse, success=green, failed=red

### `src/components/dag/DAGEdge.tsx` (max 60 lines):
Animated edge with data-flow directional animation

### `src/components/dag/DAGCanvas.tsx` (max 200 lines):
```tsx
// ReactFlow provider + canvas
// Registers DAGNode and DAGEdge as custom types
// Reads nodes/edges from workflow.store
// Applies dagre layout via useMemo (only recomputes when DAG structure changes)
// MiniMap + Controls enabled
```

### `src/pages/DAGPage.tsx`:
- DAGCanvas top section
- ConfidenceBadge summary
- "Run Workflow" button → calls execution.service.startExecution() → navigates to /execution/:id
- "Edit" button → navigates back to /

### `src/components/shared/ConfidenceBadge.tsx`:
Shows score 0-100 + risk label color-coded: low=green, medium=yellow, high=red

## Self-Test ✅
```bash
cd frontend && npm run dev
# Temporarily add hardcoded DAG to workflow.store initial state:
# 3 nodes: jira→slack→github, confidence 0.82
# Navigate to /dag — should render the 3-node DAG with connections
# Remove hardcoded state after verifying
npx tsc --noEmit
```