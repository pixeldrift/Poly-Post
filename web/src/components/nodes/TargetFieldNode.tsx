import { Handle, Position, type NodeProps } from 'reactflow';
import './fieldNodes.css';

export interface TargetNodeData {
  label: string;
  group?: 'standard' | 'custom';
  required?: boolean;
  connected: boolean;
}

export function TargetFieldNode({ data }: NodeProps<TargetNodeData>) {
  return (
    <div
      className={`field-node target-field-node${data.group ? ` group-${data.group}` : ''}${
        data.connected ? ' is-connected' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="field-handle" />
      <div className="field-node-main">
        <span className="field-node-name">
          {data.label}
          {data.required && <span className="field-required">*</span>}
        </span>
        {data.group && (
          <span className={`field-group-tag tag-${data.group}`}>
            {data.group === 'standard' ? 'Standard' : 'Custom'}
          </span>
        )}
      </div>
    </div>
  );
}
