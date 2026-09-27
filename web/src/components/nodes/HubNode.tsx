import { Handle, Position, type NodeProps } from 'reactflow';
import { useMapperStore } from '../../store';
import type { ClusterKind } from '../../engine/layout';
import type { ConnectionStatus } from '../../types';
import './fieldNodes.css';

export interface HubNodeData {
  clusterKey: string;
  kind: ClusterKind;
  status: ConnectionStatus;
}

const STROKE = { stroke: 'currentColor', strokeWidth: 2.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const KIND_ICON: Record<ClusterKind, string> = {
  // one line straight across
  direct: 'M3 10h12M11 5.5 16 10l-5 4.5',
  // two lines converging into one
  merge: 'M3 4.5 10 10l-7 5.5M10 10h7',
  // one line fanning into two
  split: 'M17 4.5 10 10l7 5.5M10 10H3',
  // mixed merges/splits in one cluster
  complex: 'M10 3v14M3 10h14M5.8 5.8l8.4 8.4M14.2 5.8l-8.4 8.4',
};

export function HubNode({ data }: NodeProps<HubNodeData>) {
  const openEditCluster = useMapperStore((s) => s.openEditCluster);

  return (
    <div className="hub-node-wrap">
      <Handle type="target" position={Position.Left} className="hub-handle" />
      <button
        className={`hub-node status-${data.status}`}
        onClick={(e) => {
          e.stopPropagation();
          openEditCluster(data.clusterKey);
        }}
        title={`${data.kind} connection — click to edit`}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d={KIND_ICON[data.kind]} {...STROKE} />
        </svg>
      </button>
      <Handle type="source" position={Position.Right} className="hub-handle" />
    </div>
  );
}
