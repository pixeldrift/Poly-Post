import type { NodeProps } from 'reactflow';
import './fieldNodes.css';

export interface SectionLabelData {
  text: string;
}

export function SectionLabelNode({ data }: NodeProps<SectionLabelData>) {
  return <div className="section-label-node">{data.text}</div>;
}
