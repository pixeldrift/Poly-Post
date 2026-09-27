import { EdgeLabelRenderer, getBezierPath, type EdgeProps } from 'reactflow';
import { useMapperStore } from '../../store';
import type { ConnectionStatus, ConnectionType } from '../../types';
import './MappingEdge.css';

export interface MappingEdgeData {
  connectionId: string;
  connectionType: ConnectionType;
  status: ConnectionStatus;
  showLabel: boolean;
}

const TYPE_GLYPH: Record<ConnectionType, string> = {
  direct: '→',
  merge: '⇥',
  split: '⇉',
};

export function MappingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<MappingEdgeData>) {
  const openEditConnection = useMapperStore((s) => s.openEditConnection);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  if (!data) return null;
  const statusClass = `status-${data.status}`;

  return (
    <>
      <path id={id} className={`mapping-edge-path ${statusClass}`} d={edgePath} fill="none" />
      {data.showLabel && (
        <EdgeLabelRenderer>
          <button
            className={`mapping-edge-label ${statusClass}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              openEditConnection(data.connectionId);
            }}
            title={`${data.connectionType} connection — click to edit`}
          >
            {TYPE_GLYPH[data.connectionType]}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
