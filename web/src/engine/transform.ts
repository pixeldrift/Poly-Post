import type { Connection, ConnectionFormat, ConnectionStatus, SourceField, SourceRow } from '../types';

export function splitValue(value: string, separators: string[]): string[] {
  if (separators.length === 0 || separators.every((s) => s === '')) return [value];
  const pattern = separators
    .filter((s) => s !== '')
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return value.split(new RegExp(pattern)).map((part) => part.trim());
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const tenDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (tenDigits.length !== 10) return value.trim();
  return `(${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
}

function formatTitleCase(value: string): string {
  return value.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Post-processes a resolved value — the "interpret this field as..." step from the proposal. */
export function formatValue(value: string, format?: ConnectionFormat): string {
  if (!value) return value;
  switch (format) {
    case 'phone':
      return formatPhone(value);
    case 'titlecase':
      return formatTitleCase(value);
    case 'uppercase':
      return value.toUpperCase();
    case 'lowercase':
      return value.toLowerCase();
    case 'trim':
      return value.trim();
    default:
      return value;
  }
}

function resolveRawValue(connection: Connection, row: SourceRow): string {
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

export function resolveConnectionValue(connection: Connection, row: SourceRow): string {
  return formatValue(resolveRawValue(connection, row), connection.format);
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
