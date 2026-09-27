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
import { MappingEdge, type MappingEdgeData } from './edges/MappingEdge';
import { connectionStatus } from '../engine/transform';
import './MapperCanvas.css';

const nodeTypes = { sourceField: SourceFieldNode, targetField: TargetFieldNode };
const edgeTypes = { mapping: MappingEdge };

const ROW_HEIGHT = 64;
const SOURCE_X = 24;
const TARGET_X = 420;

function CanvasInner() {
  const sourceFields = useMapperStore((s) => s.sourceFields);
  const connections = useMapperStore((s) => s.connections);
  const connectFields = useMapperStore((s) => s.connectFields);
  const schema = useMapperStore((s) => s.selectedSchema());

  const connectedSourceIds = useMemo(
    () => new Set(connections.flatMap((c) => c.sourceIds)),
    [connections],
  );
  const connectedTargetIds = useMemo(
    () => new Set(connections.map((c) => c.targetId)),
    [connections],
  );

  const nodes: Node[] = useMemo(() => {
    const sourceNodes: Node<SourceNodeData>[] = sourceFields.map((field, i) => ({
      id: field.id,
      type: 'sourceField',
      position: { x: SOURCE_X, y: 8 + i * ROW_HEIGHT },
      data: {
        name: field.name,
        sampleValue: field.sampleValue,
        connected: connectedSourceIds.has(field.id),
      },
      draggable: false,
      connectable: true,
    }));
    const targetNodes: Node<TargetNodeData>[] = schema.fields.map((field, i) => ({
      id: field.id,
      type: 'targetField',
      position: { x: TARGET_X, y: 8 + i * ROW_HEIGHT },
      data: {
        label: field.label,
        group: field.group,
        required: field.required,
        connected: connectedTargetIds.has(field.id),
      },
      draggable: false,
      connectable: true,
    }));
    return [...sourceNodes, ...targetNodes];
  }, [sourceFields, schema, connectedSourceIds, connectedTargetIds]);

  const edges: Edge<MappingEdgeData>[] = useMemo(() => {
    const result: Edge<MappingEdgeData>[] = [];
    for (const connection of connections) {
      const status = connectionStatus(connection);
      connection.sourceIds.forEach((sourceId, i) => {
        result.push({
          id: `${connection.id}::${sourceId}`,
          source: sourceId,
          target: connection.targetId,
          type: 'mapping',
          data: {
            connectionId: connection.id,
            connectionType: connection.type,
            status,
            showLabel: i === connection.sourceIds.length - 1,
          },
        });
      });
    }
    return result;
  }, [connections]);

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
      minZoom={0.5}
      maxZoom={1.25}
      nodesDraggable={false}
      elementsSelectable={false}
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
        <span>Source File</span>
        <span>Target Fields</span>
      </div>
      <div className="mapper-canvas-body">
        <ReactFlowProvider>
          <CanvasInner />
        </ReactFlowProvider>
      </div>
      <p className="mapper-canvas-hint">
        Drag from a source field's dot to a target field to connect them. Drop a second source on
        an already-connected target to merge; drag one source to a second target to split it.
      </p>
    </section>
  );
}
