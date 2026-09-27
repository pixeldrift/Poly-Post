import { getBezierPath, type EdgeProps } from 'reactflow';
import './MappingEdge.css';

export interface MappingEdgeData {
  status: 'ok' | 'needs-input' | 'warning';
  side: 'source' | 'target';
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
  const sideClass = `side-${data?.side ?? 'source'}`;

  return <path className={`mapping-edge-path ${sideClass} ${statusClass}`} d={edgePath} fill="none" />;
}
