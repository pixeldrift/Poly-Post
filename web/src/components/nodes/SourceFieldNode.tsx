import { Handle, Position, type NodeProps } from 'reactflow';
import './fieldNodes.css';

export interface SourceNodeData {
  name: string;
  sampleValue: string;
  connected: boolean;
}

export function SourceFieldNode({ data }: NodeProps<SourceNodeData>) {
  return (
    <div
      className={`field-node source-field-node${data.connected ? ' is-connected' : ' is-tray'}`}
    >
      <div className="field-node-main">
        <span className="field-node-name">{data.name}</span>
        <span className="field-node-sample" title={data.sampleValue}>
          {data.sampleValue || '—'}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="field-handle" />
    </div>
  );
}
