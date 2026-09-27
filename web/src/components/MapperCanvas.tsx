import { useMemo, useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  type Connection as RFConnection,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useMapperStore } from '../store';
import { SourceFieldNode, type SourceNodeData } from './nodes/SourceFieldNode';
import { TargetFieldNode, type TargetNodeData } from './nodes/TargetFieldNode';
import { HubNode, type HubNodeData } from './nodes/HubNode';
import { TrayBackgroundNode, type TrayBackgroundData } from './nodes/TrayBackgroundNode';
import { DividerLineNode } from './nodes/DividerLineNode';
import { MappingEdge, type MappingEdgeData } from './edges/MappingEdge';
import { aggregateStatus, connectionStatus } from '../engine/transform';
import { computeClusters, computeClusterLayout } from '../engine/layout';
import './MapperCanvas.css';

const nodeTypes = {
  sourceField: SourceFieldNode,
  targetField: TargetFieldNode,
  hub: HubNode,
  trayBackground: TrayBackgroundNode,
  dividerLine: DividerLineNode,
};
const edgeTypes = { mapping: MappingEdge };

// Every field box is a fixed size and the two columns sit only as far
// apart as the connector hub needs — this is meant to read as a compact,
// scrolling list (like a table), not a wide pannable canvas.
const ROW_HEIGHT = 64;
const TOP_MARGIN = 12;
const FIELD_NODE_WIDTH = 126;
const FIELD_NODE_HEIGHT = 52;
const COLUMN_GAP = 84;
const HUB_WIDTH = 40;
const SOURCE_X = 0;
const TARGET_X = FIELD_NODE_WIDTH + COLUMN_GAP;
export const CANVAS_CONTENT_WIDTH = TARGET_X + FIELD_NODE_WIDTH;
const HUB_X = CANVAS_CONTENT_WIDTH / 2 - HUB_WIDTH / 2;
const DIVIDER_WIDTH = 10;
const TRAY_GAP = 32;
const LABEL_HEIGHT = 24;
const TRAY_BOX_PAD = 14;

function rowToY(row: number): number {
  return TOP_MARGIN + row * ROW_HEIGHT;
}

export interface CanvasLayoutInfo {
  height: number;
  hasTray: boolean;
  hintOpacity: number;
}

function CanvasInner({ onLayoutInfo }: { onLayoutInfo: (info: CanvasLayoutInfo) => void }) {
  const sourceFields = useMapperStore((s) => s.sourceFields);
  const connections = useMapperStore((s) => s.connections);
  const connectFields = useMapperStore((s) => s.connectFields);
  const schema = useMapperStore((s) => s.selectedSchema());

  const clusters = useMemo(
    () => computeClusters(connections, sourceFields, schema.fields),
    [connections, sourceFields, schema.fields],
  );
  const layout = useMemo(() => computeClusterLayout(clusters), [clusters]);

  const unconnectedSourceFields = useMemo(
    () => sourceFields.filter((f) => !layout.sourceRow.has(f.id)),
    [sourceFields, layout],
  );
  const unconnectedTargetFields = useMemo(
    () => schema.fields.filter((f) => !layout.targetRow.has(f.id)),
    [schema.fields, layout],
  );

  const connectedBlockBottom = rowToY(layout.totalRows);
  const traySourceCount = unconnectedSourceFields.length;
  const trayTargetCount = unconnectedTargetFields.length;
  const hasTray = traySourceCount > 0 || trayTargetCount > 0;
  const trayLabelY = connectedBlockBottom + (layout.totalRows > 0 ? TRAY_GAP : 0);
  const trayFieldsStartY = trayLabelY + LABEL_HEIGHT;
  const canvasHeight =
    Math.max(
      connectedBlockBottom,
      hasTray ? trayFieldsStartY + Math.max(traySourceCount, trayTargetCount) * ROW_HEIGHT : 0,
    ) + 16;

  const totalFieldCount = sourceFields.length + schema.fields.length;
  const connectedFieldCount = totalFieldCount - traySourceCount - trayTargetCount;
  const progress = totalFieldCount > 0 ? connectedFieldCount / totalFieldCount : 0;
  const hintOpacity = hasTray ? Math.max(0.35, 1 - progress) : 0;

  useEffect(
    () => onLayoutInfo({ height: canvasHeight, hasTray, hintOpacity }),
    [canvasHeight, hasTray, hintOpacity, onLayoutInfo],
  );

  const nodes: Node[] = useMemo(() => {
    const result: Node[] = [];

    sourceFields.forEach((field) => {
      const connectedRow = layout.sourceRow.get(field.id);
      const trayIndex = unconnectedSourceFields.findIndex((f) => f.id === field.id);
      const y = connectedRow !== undefined ? rowToY(connectedRow) : trayFieldsStartY + trayIndex * ROW_HEIGHT;
      const data: SourceNodeData = {
        name: field.name,
        sampleValue: field.sampleValue,
        connected: connectedRow !== undefined,
      };
      result.push({
        id: field.id,
        type: 'sourceField',
        position: { x: SOURCE_X, y },
        style: { width: FIELD_NODE_WIDTH, height: FIELD_NODE_HEIGHT },
        data,
        draggable: false,
        connectable: true,
        selectable: false,
      });
    });

    schema.fields.forEach((field) => {
      const connectedRow = layout.targetRow.get(field.id);
      const trayIndex = unconnectedTargetFields.findIndex((f) => f.id === field.id);
      const y = connectedRow !== undefined ? rowToY(connectedRow) : trayFieldsStartY + trayIndex * ROW_HEIGHT;
      const data: TargetNodeData = {
        label: field.label,
        group: field.group,
        required: field.required,
        connected: connectedRow !== undefined,
      };
      result.push({
        id: field.id,
        type: 'targetField',
        position: { x: TARGET_X, y },
        style: { width: FIELD_NODE_WIDTH, height: FIELD_NODE_HEIGHT },
        data,
        draggable: false,
        connectable: true,
        selectable: false,
      });
    });

    for (const cluster of clusters) {
      const row = layout.hubRow.get(cluster.key) ?? 0;
      const statuses = cluster.connectionIds
        .map((id) => connections.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .map(connectionStatus);
      const data: HubNodeData = {
        clusterKey: cluster.key,
        kind: cluster.kind,
        status: aggregateStatus(statuses),
      };
      result.push({
        id: `hub:${cluster.key}`,
        type: 'hub',
        position: { x: HUB_X, y: rowToY(row) + (FIELD_NODE_HEIGHT - HUB_WIDTH) / 2 },
        style: { width: HUB_WIDTH, height: HUB_WIDTH },
        data,
        draggable: false,
        connectable: false,
        selectable: false,
      });
    }

    if (hasTray) {
      const maxTrayCount = Math.max(traySourceCount, trayTargetCount);
      const trayBandHeight = (maxTrayCount - 1) * ROW_HEIGHT + LABEL_HEIGHT + FIELD_NODE_HEIGHT + TRAY_BOX_PAD;
      const data: TrayBackgroundData = { label: 'Available Fields' };
      result.push({
        id: 'tray-background',
        type: 'trayBackground',
        position: { x: SOURCE_X, y: trayLabelY - TRAY_BOX_PAD },
        style: { width: CANVAS_CONTENT_WIDTH, height: trayBandHeight },
        data,
        draggable: false,
        connectable: false,
        selectable: false,
        zIndex: -1,
      });
    }

    result.push({
      id: 'divider-line',
      type: 'dividerLine',
      position: { x: HUB_X + HUB_WIDTH / 2 - DIVIDER_WIDTH / 2, y: 0 },
      style: { width: DIVIDER_WIDTH, height: canvasHeight },
      data: {},
      draggable: false,
      connectable: false,
      selectable: false,
      zIndex: -1,
    });

    return result;
  }, [
    sourceFields,
    schema.fields,
    clusters,
    layout,
    connections,
    unconnectedSourceFields,
    unconnectedTargetFields,
    trayFieldsStartY,
    trayLabelY,
    hasTray,
    traySourceCount,
    trayTargetCount,
    canvasHeight,
  ]);

  const edges: Edge<MappingEdgeData>[] = useMemo(() => {
    const result: Edge<MappingEdgeData>[] = [];
    for (const cluster of clusters) {
      const hubId = `hub:${cluster.key}`;
      const connectionById = new Map(
        cluster.connectionIds
          .map((id) => connections.find((c) => c.id === id))
          .filter((c): c is NonNullable<typeof c> => Boolean(c))
          .map((c) => [c.id, c] as const),
      );
      const allStatuses = [...connectionById.values()].map(connectionStatus);
      const sharedStatus = aggregateStatus(allStatuses);

      for (const sourceId of cluster.sourceIds) {
        result.push({
          id: `${cluster.key}::src::${sourceId}`,
          source: sourceId,
          target: hubId,
          type: 'mapping',
          data: { status: sharedStatus, side: 'source' },
        });
      }
      for (const targetId of cluster.targetIds) {
        const conn = [...connectionById.values()].find((c) => c.targetId === targetId);
        result.push({
          id: `${cluster.key}::tgt::${targetId}`,
          source: hubId,
          target: targetId,
          type: 'mapping',
          data: { status: conn ? connectionStatus(conn) : sharedStatus, side: 'target' },
        });
      }
    }
    return result;
  }, [clusters, connections]);

  const onConnect = useCallback(
    (params: RFConnection) => {
      if (params.source && params.target) {
        connectFields(params.source, params.target);
      }
    },
    [connectFields],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onConnect={onConnect}
      nodesDraggable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      proOptions={{ hideAttribution: false }}
    />
  );
}

const CANVAS_SIDE_PADDING = 14;

export function MapperCanvas() {
  const [layoutInfo, setLayoutInfo] = useState<CanvasLayoutInfo>({
    height: 240,
    hasTray: true,
    hintOpacity: 1,
  });

  return (
    <section className="mapper-canvas card">
      <div
        className="mapper-canvas-inner"
        style={{ width: CANVAS_CONTENT_WIDTH + CANVAS_SIDE_PADDING * 2 }}
      >
        <div className="mapper-canvas-header">
          <span>Source</span>
          <span>Target</span>
        </div>
        <div className="mapper-canvas-body" style={{ height: layoutInfo.height }}>
          <div className="mapper-canvas-flow" style={{ width: CANVAS_CONTENT_WIDTH }}>
            <ReactFlowProvider>
              <CanvasInner onLayoutInfo={setLayoutInfo} />
            </ReactFlowProvider>
          </div>
        </div>
        {layoutInfo.hasTray && (
          <p className="mapper-canvas-hint" style={{ opacity: layoutInfo.hintOpacity }}>
            Available fields wait above — drag a dot across to connect one, or drop a second
            field on an already-connected slot to merge or split. You don't have to map
            everything.
          </p>
        )}
      </div>
    </section>
  );
}
