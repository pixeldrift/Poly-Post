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

const KIND_GLYPH: Record<ClusterKind, string> = {
  direct: '→',
  merge: '⇥',
  split: '⇉',
  complex: '✳',
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
        {KIND_GLYPH[data.kind]}
      </button>
      <Handle type="source" position={Position.Right} className="hub-handle" />
    </div>
  );
}
