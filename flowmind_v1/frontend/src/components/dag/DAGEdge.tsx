import { getBezierPath, type EdgeProps } from '@xyflow/react';

export function DAGEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path stroke-2 stroke-muted-foreground/50 transition-all hover:stroke-primary"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {data?.label && (
        <text>
          <textPath
            href={`#${id}`}
            style={{ fontSize: '10px' }}
            startOffset="50%"
            textAnchor="middle"
            className="fill-muted-foreground font-mono font-medium"
          >
            {data.label as string}
          </textPath>
        </text>
      )}
    </>
  );
}
