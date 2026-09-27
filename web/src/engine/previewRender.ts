import type { Connection, PostTypeSchema, SourceRow, TargetField } from '../types';
import { buildPreviewRecord } from './transform';

export interface PreviewCard {
  title: string;
  subtitle: string;
  detailLines: { label: string; value: string }[];
  metaLines: { label: string; value: string }[];
}

function fieldByPattern(fields: TargetField[], pattern: RegExp): TargetField | undefined {
  return fields.find((f) => pattern.test(f.label));
}

export function renderPreviewCard(
  schema: PostTypeSchema,
  connections: Connection[],
  row: SourceRow,
): PreviewCard {
  const record = buildPreviewRecord(connections, row);
  const nameField = fieldByPattern(schema.fields, /name/i);
  const cityField = fieldByPattern(schema.fields, /city/i);
  const stateField = fieldByPattern(schema.fields, /state/i);
  const emailField = fieldByPattern(schema.fields, /email/i);
  const phoneField = fieldByPattern(schema.fields, /phone/i);

  const usedIds = new Set(
    [nameField, cityField, stateField, emailField, phoneField]
      .filter((f): f is TargetField => Boolean(f))
      .map((f) => f.id),
  );

  const title = (nameField && record[nameField.id]) || `${schema.label} entry`;
  const cityValue = cityField ? record[cityField.id] : '';
  const stateValue = stateField ? record[stateField.id] : '';
  const subtitle = [cityValue, stateValue].filter(Boolean).join(', ');

  const detailLines: { label: string; value: string }[] = [];
  if (emailField && record[emailField.id]) {
    detailLines.push({ label: 'Email', value: record[emailField.id] });
  }
  if (phoneField && record[phoneField.id]) {
    detailLines.push({ label: 'Phone', value: record[phoneField.id] });
  }
  for (const field of schema.fields) {
    if (field.group !== 'custom' || usedIds.has(field.id)) continue;
    const value = record[field.id];
    if (value) detailLines.push({ label: field.label, value });
  }

  const metaLines: { label: string; value: string }[] = [];
  for (const field of schema.fields) {
    if (field.group !== 'standard') continue;
    metaLines.push({ label: field.label, value: record[field.id] || '(default)' });
  }

  return { title, subtitle, detailLines, metaLines };
}
