import type { Connection, ConnectionStatus, SourceField, SourceRow } from '../types';

export function splitValue(value: string, separators: string[]): string[] {
  if (separators.length === 0 || separators.every((s) => s === '')) return [value];
  const pattern = separators
    .filter((s) => s !== '')
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return value.split(new RegExp(pattern)).map((part) => part.trim());
}

export function resolveConnectionValue(connection: Connection, row: SourceRow): string {
  switch (connection.type) {
    case 'direct':
      return row[connection.sourceIds[0]] ?? '';
    case 'merge': {
      const sep = connection.mergeSeparator ?? ' ';
      return connection.sourceIds.map((id) => row[id] ?? '').join(sep);
    }
    case 'split': {
      const raw = row[connection.sourceIds[0]] ?? '';
      const parts = splitValue(raw, connection.splitSeparators ?? [',']);
      const idx = connection.partIndex ?? 0;
      return parts[idx] ?? '';
    }
    default:
      return '';
  }
}

export function connectionStatus(connection: Connection): ConnectionStatus {
  if (connection.type === 'split') {
    const hasSeparator = (connection.splitSeparators ?? []).some((s) => s.trim() !== '');
    if (!hasSeparator) return 'needs-input';
  }
  if (connection.type === 'merge' && connection.sourceIds.length < 2) {
    return 'needs-input';
  }
  return 'ok';
}

/** Builds { targetFieldId: renderedValue } for one source row. */
export function buildPreviewRecord(
  connections: Connection[],
  row: SourceRow,
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const connection of connections) {
    record[connection.targetId] = resolveConnectionValue(connection, row);
  }
  return record;
}

export function connectionResultPreview(
  connection: Connection,
  sourceFields: SourceField[],
): string {
  const sampleRow: SourceRow = {};
  for (const field of sourceFields) sampleRow[field.id] = field.sampleValue;
  return resolveConnectionValue(connection, sampleRow);
}
