import { getBezierPath, type EdgeProps } from 'reactflow';
import './MappingEdge.css';

export interface MappingEdgeData {
  status: 'ok' | 'needs-input' | 'warning';
}

export function MappingEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<MappingEdgeData>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const statusClass = `status-${data?.status ?? 'ok'}`;

  return <path className={`mapping-edge-path ${statusClass}`} d={edgePath} fill="none" />;
}
