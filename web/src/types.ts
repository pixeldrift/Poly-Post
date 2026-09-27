export interface SourceField {
  id: string;
  name: string;
  sampleValue: string;
}

export type TargetFieldGroup = 'standard' | 'custom';

export interface TargetField {
  id: string;
  label: string;
  group: TargetFieldGroup;
  /** Alternate names used for auto-matching against source columns. */
  aliases: string[];
  required?: boolean;
}

export interface PostTypeSchema {
  id: string;
  label: string;
  templates: string[];
  fields: TargetField[];
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
}

export type ConnectionStatus = 'ok' | 'needs-input' | 'warning';

export interface SourceRow {
  [sourceFieldId: string]: string;
}
