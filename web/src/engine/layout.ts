import type { Connection, SourceField, TargetField } from '../types';

export type ClusterKind = 'direct' | 'merge' | 'split' | 'complex';

export interface FieldCluster {
  /** Stable, content-derived key (sorted source/target ids) — safe to keep across re-renders. */
  key: string;
  kind: ClusterKind;
  /** Source field ids, in source-list order. */
  sourceIds: string[];
  /** Target field ids, in target-schema order. */
  targetIds: string[];
  /** All Connection ids that belong to this cluster (>1 only for a multi-target split). */
  connectionIds: string[];
}

/**
 * Groups connections into connected components over the source/target field
 * graph. A plain 1:1 connection, every connection sharing one target
 * (merge), and every connection sharing one source (split) each form their
 * own cluster — this is what lets the canvas lay out matched fields in
 * parallel rows instead of an arbitrary field-list order.
 */
export function computeClusters(
  connections: Connection[],
  sourceFields: SourceField[],
  targetFields: TargetField[],
): FieldCluster[] {
  const sourceOrder = new Map(sourceFields.map((f, i) => [f.id, i]));
  const targetOrder = new Map(targetFields.map((f, i) => [f.id, i]));

  const parent = new Map<string, string>();
  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (parent.get(x) !== root) {
      const next = parent.get(x)!;
      parent.set(x, root);
      x = next;
    }
    return root;
  }
  function ensure(x: string): void {
    if (!parent.has(x)) parent.set(x, x);
  }
  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const conn of connections) {
    const tKey = `t:${conn.targetId}`;
    ensure(tKey);
    for (const sId of conn.sourceIds) {
      const sKey = `s:${sId}`;
      ensure(sKey);
      union(sKey, tKey);
    }
  }

  const groups = new Map<
    string,
    { sourceIds: Set<string>; targetIds: Set<string>; connectionIds: string[] }
  >();
  for (const conn of connections) {
    const root = find(`t:${conn.targetId}`);
    let group = groups.get(root);
    if (!group) {
      group = { sourceIds: new Set(), targetIds: new Set(), connectionIds: [] };
      groups.set(root, group);
    }
    group.targetIds.add(conn.targetId);
    for (const sId of conn.sourceIds) group.sourceIds.add(sId);
    group.connectionIds.push(conn.id);
  }

  const clusters: FieldCluster[] = [];
  for (const group of groups.values()) {
    const sourceIds = [...group.sourceIds].sort(
      (a, b) => (sourceOrder.get(a) ?? 0) - (sourceOrder.get(b) ?? 0),
    );
    const targetIds = [...group.targetIds].sort(
      (a, b) => (targetOrder.get(a) ?? 0) - (targetOrder.get(b) ?? 0),
    );
    let kind: ClusterKind = 'complex';
    if (sourceIds.length === 1 && targetIds.length === 1) kind = 'direct';
    else if (sourceIds.length > 1 && targetIds.length === 1) kind = 'merge';
    else if (sourceIds.length === 1 && targetIds.length > 1) kind = 'split';

    clusters.push({
      key: `${sourceIds.join(',')}|${targetIds.join(',')}`,
      kind,
      sourceIds,
      targetIds,
      connectionIds: group.connectionIds,
    });
  }

  clusters.sort((a, b) => {
    const aIdx = Math.min(...a.targetIds.map((id) => targetOrder.get(id) ?? Infinity));
    const bIdx = Math.min(...b.targetIds.map((id) => targetOrder.get(id) ?? Infinity));
    return aIdx - bIdx;
  });

  return clusters;
}

export interface ClusterLayout {
  /** Row position (in whole row-units, not pixels) for each connected field id. */
  sourceRow: Map<string, number>;
  targetRow: Map<string, number>;
  /** How many grid rows tall each field's box visually spans (default 1). */
  sourceSpan: Map<string, number>;
  targetSpan: Map<string, number>;
  /** Row position and span of each cluster's connector hub, keyed by cluster key. */
  hubRow: Map<string, number>;
  hubSpan: Map<string, number>;
  /** Total height of the laid-out block, in row-units. */
  totalRows: number;
}

/**
 * Positions every field on a uniform, equidistant row grid — every row is
 * exactly one row-unit tall, no matter which cluster it belongs to, so the
 * whole canvas reads like a table. A 1:1 connection sits on one row; the
 * "many" side of a merge/split occupies consecutive rows starting at the
 * cluster's top row, and the "one" side gets a box that *spans* the same
 * rows (rendered tall, content vertically centered via CSS) so it still
 * reads as centered against the many without floating off the row grid.
 */
export function computeClusterLayout(clusters: FieldCluster[]): ClusterLayout {
  const sourceRow = new Map<string, number>();
  const targetRow = new Map<string, number>();
  const sourceSpan = new Map<string, number>();
  const targetSpan = new Map<string, number>();
  const hubRow = new Map<string, number>();
  const hubSpan = new Map<string, number>();
  let cursor = 0;

  for (const cluster of clusters) {
    const height = Math.max(cluster.sourceIds.length, cluster.targetIds.length);

    if (cluster.kind === 'merge') {
      cluster.sourceIds.forEach((id, i) => {
        sourceRow.set(id, cursor + i);
        sourceSpan.set(id, 1);
      });
      targetRow.set(cluster.targetIds[0], cursor);
      targetSpan.set(cluster.targetIds[0], height);
    } else if (cluster.kind === 'split') {
      cluster.targetIds.forEach((id, i) => {
        targetRow.set(id, cursor + i);
        targetSpan.set(id, 1);
      });
      sourceRow.set(cluster.sourceIds[0], cursor);
      sourceSpan.set(cluster.sourceIds[0], height);
    } else if (cluster.kind === 'direct') {
      sourceRow.set(cluster.sourceIds[0], cursor);
      sourceSpan.set(cluster.sourceIds[0], 1);
      targetRow.set(cluster.targetIds[0], cursor);
      targetSpan.set(cluster.targetIds[0], 1);
    } else {
      cluster.sourceIds.forEach((id, i) => {
        sourceRow.set(id, cursor + i);
        sourceSpan.set(id, 1);
      });
      cluster.targetIds.forEach((id, i) => {
        targetRow.set(id, cursor + i);
        targetSpan.set(id, 1);
      });
    }

    hubRow.set(cluster.key, cursor);
    hubSpan.set(cluster.key, height);

    cursor += height;
  }

  return { sourceRow, targetRow, sourceSpan, targetSpan, hubRow, hubSpan, totalRows: cursor };
}
