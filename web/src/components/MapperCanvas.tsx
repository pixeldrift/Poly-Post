import { useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
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
import { TrayBoxNode, type TrayBoxData } from './nodes/TrayBoxNode';
import { DividerLineNode } from './nodes/DividerLineNode';
import { MappingEdge, type MappingEdgeData } from './edges/MappingEdge';
import { aggregateStatus, connectionStatus } from '../engine/transform';
import { computeClusters, computeClusterLayout } from '../engine/layout';
import './MapperCanvas.css';

const nodeTypes = {
  sourceField: SourceFieldNode,
  targetField: TargetFieldNode,
  hub: HubNode,
  trayBox: TrayBoxNode,
  dividerLine: DividerLineNode,
};
const edgeTypes = { mapping: MappingEdge };

const ROW_HEIGHT = 64;
const ROW_GAP = 12;
const TOP_MARGIN = 12;
const SOURCE_X = 24;
const FIELD_NODE_WIDTH = 208;
const TARGET_X = 480;
const HUB_WIDTH = 40;
const DIVIDER_WIDTH = 10;
const HUB_X = (SOURCE_X + FIELD_NODE_WIDTH + TARGET_X) / 2 - HUB_WIDTH / 2;
const TRAY_GAP = 32;
const LABEL_HEIGHT = 24;
const TRAY_BOX_PAD = 16;

/** Pixel height for a node spanning `span` grid rows, with the same trailing
 * gap a single-row field naturally has — keeps every row equidistant. */
function spanHeight(span: number): number {
  return span * ROW_HEIGHT - ROW_GAP;
}

function rowToY(row: number): number {
  return TOP_MARGIN + row * ROW_HEIGHT;
}

function CanvasInner() {
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
    ) + 20;

  const nodes: Node[] = useMemo(() => {
    const result: Node[] = [];

    sourceFields.forEach((field) => {
      const connectedRow = layout.sourceRow.get(field.id);
      const span = layout.sourceSpan.get(field.id) ?? 1;
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
        style: { width: FIELD_NODE_WIDTH, height: spanHeight(span) },
        data,
        draggable: false,
        connectable: true,
        selectable: false,
      });
    });

    schema.fields.forEach((field) => {
      const connectedRow = layout.targetRow.get(field.id);
      const span = layout.targetSpan.get(field.id) ?? 1;
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
        style: { width: FIELD_NODE_WIDTH, height: spanHeight(span) },
        data,
        draggable: false,
        connectable: true,
        selectable: false,
      });
    });

    for (const cluster of clusters) {
      const row = layout.hubRow.get(cluster.key) ?? 0;
      const span = layout.hubSpan.get(cluster.key) ?? 1;
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
        position: { x: HUB_X, y: rowToY(row) },
        style: { width: HUB_WIDTH, height: spanHeight(span) },
        data,
        draggable: false,
        connectable: false,
        selectable: false,
      });
    }

    const trayBoxHeight = (count: number) =>
      count === 0 ? 0 : (count - 1) * ROW_HEIGHT + LABEL_HEIGHT + spanHeight(1) + TRAY_BOX_PAD;
    const trayBoxY = trayLabelY - TRAY_BOX_PAD;

    if (traySourceCount > 0) {
      const data: TrayBoxData = { label: 'Available Fields' };
      result.push({
        id: 'tray-box-source',
        type: 'trayBox',
        position: { x: SOURCE_X - TRAY_BOX_PAD, y: trayBoxY },
        style: { width: FIELD_NODE_WIDTH + TRAY_BOX_PAD * 2, height: trayBoxHeight(traySourceCount) },
        data,
        draggable: false,
        connectable: false,
        selectable: false,
        zIndex: -1,
      });
    }
    if (trayTargetCount > 0) {
      const data: TrayBoxData = { label: 'Available Fields' };
      result.push({
        id: 'tray-box-target',
        type: 'trayBox',
        position: { x: TARGET_X - TRAY_BOX_PAD, y: trayBoxY },
        style: { width: FIELD_NODE_WIDTH + TRAY_BOX_PAD * 2, height: trayBoxHeight(trayTargetCount) },
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
          data: { status: sharedStatus },
        });
      }
      for (const targetId of cluster.targetIds) {
        const conn = [...connectionById.values()].find((c) => c.targetId === targetId);
        result.push({
          id: `${cluster.key}::tgt::${targetId}`,
          source: hubId,
          target: targetId,
          type: 'mapping',
          data: { status: conn ? connectionStatus(conn) : sharedStatus },
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
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
      minZoom={0.4}
      maxZoom={1.25}
      nodesDraggable={false}
      panOnScroll
      zoomOnScroll={false}
      proOptions={{ hideAttribution: false }}
    >
      <Background gap={20} color="var(--color-border)" />
      <Controls showInteractive={false} position="bottom-left" />
    </ReactFlow>
  );
}

export function MapperCanvas() {
  return (
    <section className="mapper-canvas card">
      <div className="mapper-canvas-header">
        <span>Source</span>
        <span>Target</span>
      </div>
      <div className="mapper-canvas-body">
        <ReactFlowProvider>
          <CanvasInner />
        </ReactFlowProvider>
      </div>
      <p className="mapper-canvas-hint">
        Drag a field's dot across to connect it. Drop a second field on an already-connected slot
        to merge or split. Unconnected fields wait in the tray below — you don't have to map
        everything.
      </p>
    </section>
  );
}
