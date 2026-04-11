import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

function DAGEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: '#E5E5E5', strokeOpacity: 0.6, strokeWidth: 2 }}
      />
      <path
        d={edgePath}
        fill="none"
        markerEnd={markerEnd}
        stroke="#007AFF"
        strokeDasharray="9 8"
        strokeLinecap="round"
        strokeWidth={2.2}
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="900ms"
          from="17"
          repeatCount="indefinite"
          to="0"
        />
      </path>
    </>
  )
}

export default DAGEdge
