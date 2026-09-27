import type { Connection, PostTypeSchema, SourceField, TargetField } from '../types';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function scoreMatch(source: SourceField, target: TargetField): number {
  const sourceNorm = normalize(source.name);
  const candidates = [target.label, ...target.aliases].map(normalize);
  if (candidates.includes(sourceNorm)) return 1;
  const partial = candidates.some((c) => c.includes(sourceNorm) || sourceNorm.includes(c));
  return partial ? 0.6 : 0;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/**
 * Suggests connections by matching source column names to target field
 * names/aliases, with two hand-curated fallbacks (first+last -> merge,
 * a comma-delimited "address" -> split into city/state) for fields that
 * don't match 1:1. A real engine would generalize these as pluggable
 * heuristics; this is enough to make auto-match feel intelligent for now.
 */
export function autoMatch(sourceFields: SourceField[], schema: PostTypeSchema): Connection[] {
  const connections: Connection[] = [];
  const usedTargets = new Set<string>();
  const usedSources = new Set<string>();

  for (const target of schema.fields) {
    let best: { source: SourceField; score: number } | null = null;
    for (const source of sourceFields) {
      if (usedSources.has(source.id)) continue;
      const score = scoreMatch(source, target);
      if (score > 0 && (!best || score > best.score)) {
        best = { source, score };
      }
    }
    if (best) {
      connections.push({
        id: nextId('conn'),
        type: 'direct',
        sourceIds: [best.source.id],
        targetId: target.id,
      });
      usedTargets.add(target.id);
      usedSources.add(best.source.id);
    }
  }

  const nameTarget = schema.fields.find((f) => normalize(f.label) === 'name');
  const first = sourceFields.find((f) => normalize(f.name).includes('first'));
  const last = sourceFields.find((f) => normalize(f.name).includes('last'));
  if (nameTarget && !usedTargets.has(nameTarget.id) && first && last) {
    connections.push({
      id: nextId('conn'),
      type: 'merge',
      sourceIds: [first.id, last.id],
      targetId: nameTarget.id,
      mergeSeparator: ' ',
    });
    usedTargets.add(nameTarget.id);
    usedSources.add(first.id);
    usedSources.add(last.id);
  }

  const address = sourceFields.find((f) => normalize(f.name).includes('address') && !usedSources.has(f.id));
  const cityTarget = schema.fields.find((f) => normalize(f.label) === 'city');
  const stateTarget = schema.fields.find((f) => normalize(f.label) === 'state');
  if (address && cityTarget && !usedTargets.has(cityTarget.id)) {
    connections.push({
      id: nextId('conn'),
      type: 'split',
      sourceIds: [address.id],
      targetId: cityTarget.id,
      splitSeparators: [','],
      partIndex: 1,
    });
    usedTargets.add(cityTarget.id);
  }
  if (address && stateTarget && !usedTargets.has(stateTarget.id)) {
    connections.push({
      id: nextId('conn'),
      type: 'split',
      sourceIds: [address.id],
      targetId: stateTarget.id,
      splitSeparators: [','],
      partIndex: 2,
    });
    usedTargets.add(stateTarget.id);
  }

  return connections;
}

export function makeConnectionId(): string {
  return nextId('conn');
}
