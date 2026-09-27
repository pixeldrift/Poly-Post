import './fieldNodes.css';

export interface DividerLineData {
  height: number;
}

export function DividerLineNode({ data }: { data: DividerLineData }) {
  return <div className="divider-line-node" style={{ height: data.height }} />;
}
