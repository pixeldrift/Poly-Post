import type { NodeProps } from 'reactflow';
import './fieldNodes.css';

export interface TrayBoxData {
  label: string;
}

export function TrayBoxNode({ data }: NodeProps<TrayBoxData>) {
  return (
    <div className="tray-box-node">
      <span className="tray-box-label">{data.label}</span>
    </div>
  );
}
