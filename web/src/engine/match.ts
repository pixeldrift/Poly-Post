import type { Connection, SourceField, TargetField, TargetSchema } from '../types';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fieldNames(field: TargetField): string[] {
  return [field.label, ...field.aliases].map(normalize);
}

function scoreMatch(source: SourceField, target: TargetField): number {
  const sourceNorm = normalize(source.name);
  const candidates = fieldNames(target);
  if (candidates.includes(sourceNorm)) return 1;
  const partial = candidates.some((c) => c.includes(sourceNorm) || sourceNorm.includes(c));
  return partial ? 0.6 : 0;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function pushConnection(
  connections: Connection[],
  target: TargetField,
  partial: Omit<Connection, 'id' | 'targetId' | 'format'>,
): void {
  connections.push({
    id: nextId('conn'),
    targetId: target.id,
    format: target.formatHint,
    ...partial,
  });
}

/** Comma-delimited "address" -> up to four split targets, in source-value order. */
const ADDRESS_PART_TARGETS: { names: string[]; partIndex: number }[] = [
  { names: ['street'], partIndex: 0 },
  { names: ['city', 'town'], partIndex: 1 },
  { names: ['state', 'province'], partIndex: 2 },
  { names: ['zip', 'zipcode', 'postalcode', 'postcode'], partIndex: 3 },
];

/**
 * Suggests connections by matching source column names to target field
 * names/aliases, with two hand-curated fallbacks (first+last -> merge,
 * a comma-delimited "address" -> split into up to four parts) for fields
 * that don't match 1:1. A real engine would generalize these as pluggable
 * heuristics; this is enough to make auto-match feel intelligent for now.
 */
export function autoMatch(sourceFields: SourceField[], schema: TargetSchema): Connection[] {
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
      pushConnection(connections, target, { type: 'direct', sourceIds: [best.source.id] });
      usedTargets.add(target.id);
      usedSources.add(best.source.id);
    }
  }

  const nameTarget = schema.fields.find((f) =>
    fieldNames(f).some((n) => n === 'name' || n === 'fullname'),
  );
  const first = sourceFields.find((f) => normalize(f.name).includes('first'));
  const last = sourceFields.find((f) => normalize(f.name).includes('last'));
  if (nameTarget && !usedTargets.has(nameTarget.id) && first && last) {
    pushConnection(connections, nameTarget, {
      type: 'merge',
      sourceIds: [first.id, last.id],
      mergeSeparator: ' ',
    });
    usedTargets.add(nameTarget.id);
    usedSources.add(first.id);
    usedSources.add(last.id);
  }

  const address = sourceFields.find(
    (f) => normalize(f.name).includes('address') && !usedSources.has(f.id),
  );
  if (address) {
    for (const { names, partIndex } of ADDRESS_PART_TARGETS) {
      const target = schema.fields.find(
        (f) => !usedTargets.has(f.id) && fieldNames(f).some((n) => names.includes(n)),
      );
      if (!target) continue;
      pushConnection(connections, target, {
        type: 'split',
        sourceIds: [address.id],
        splitSeparators: [','],
        partIndex,
      });
      usedTargets.add(target.id);
    }
  }

  return connections;
}

export function makeConnectionId(): string {
  return nextId('conn');
}
