export interface SourceField {
  id: string;
  name: string;
  sampleValue: string;
}

export type TargetFieldGroup = 'standard' | 'custom';

export type ConnectionFormat = 'phone' | 'titlecase' | 'uppercase' | 'lowercase' | 'trim';

export interface TargetField {
  id: string;
  label: string;
  /** WordPress-flavored grouping (standard vs. custom post field). Omit for non-WP targets. */
  group?: TargetFieldGroup;
  /** Alternate names used for auto-matching against source columns. */
  aliases: string[];
  required?: boolean;
  /** Formatting auto-match should apply by default when it connects this field. */
  formatHint?: ConnectionFormat;
}

export type TargetOutputKind = 'wordpress' | 'csv';

export interface TargetSchema {
  id: string;
  label: string;
  outputKind: TargetOutputKind;
  /** Preview render templates. Only meaningful for outputKind 'wordpress'. */
  templates?: string[];
  fields: TargetField[];
}

/** A self-contained demo: a source dataset paired with the target schema(s) it can map to. */
export interface Scenario {
  id: string;
  label: string;
  description: string;
  sourceFileName: string;
  sourceFields: SourceField[];
  sourceRows: SourceRow[];
  targetSchemas: TargetSchema[];
}

export type ConnectionType = 'direct' | 'merge' | 'split';

export interface Connection {
  id: string;
  type: ConnectionType;
  /** One source field for direct/split, two or more for merge. */
  sourceIds: string[];
  targetId: string;
  /** Merge: text inserted between joined values, e.g. " ". */
  mergeSeparator?: string;
  /** Split: delimiter(s) the source value is broken on. */
  splitSeparators?: string[];
  /** Split: which resulting chunk (0-based) feeds this connection's target. */
  partIndex?: number;
  /** Post-processing applied to the resolved value, e.g. standardizing phone numbers. */
  format?: ConnectionFormat;
}

export type ConnectionStatus = 'ok' | 'needs-input' | 'warning';

export interface SourceRow {
  [sourceFieldId: string]: string;
}
