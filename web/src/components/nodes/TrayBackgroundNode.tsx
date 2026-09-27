import type { NodeProps } from 'reactflow';
import './fieldNodes.css';

export interface TrayBackgroundData {
  label: string;
}

export function TrayBackgroundNode({ data }: NodeProps<TrayBackgroundData>) {
  return (
    <div className="tray-background-node">
      <span className="tray-background-label">{data.label}</span>
    </div>
  );
}
