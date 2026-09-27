import { create } from 'zustand';
import Papa from 'papaparse';
import type { Connection, Scenario, SourceField, SourceRow, TargetSchema } from './types';
import { SCENARIOS } from './data/scenarios';
import { autoMatch, makeConnectionId } from './engine/match';
import { buildPreviewRecord, resolveConnectionValue } from './engine/transform';

export interface GeneratedPostBatch {
  outputKind: 'wordpress';
  schemaLabel: string;
  titles: string[];
  createdAt: number;
}

export interface GeneratedCsvBatch {
  outputKind: 'csv';
  schemaLabel: string;
  fileName: string;
  rowCount: number;
  csvUrl: string;
  previewRows: Record<string, string>[];
  createdAt: number;
}

export type GeneratedBatch = GeneratedPostBatch | GeneratedCsvBatch;

function revokeBatchUrl(batch: GeneratedBatch | null): void {
  if (batch?.outputKind === 'csv') URL.revokeObjectURL(batch.csvUrl);
}

interface MapperState {
  scenarios: Scenario[];
  selectedScenarioId: string;

  sourceFileName: string;
  sourceFields: SourceField[];
  sourceRows: SourceRow[];

  targetSchemas: TargetSchema[];
  selectedTargetSchemaId: string;

  connections: Connection[];
  selectedTemplate: string;
  previewIndex: number;

  isImportModalOpen: boolean;
  editingClusterKey: string | null;

  lastGeneratedBatch: GeneratedBatch | null;

  selectedScenario: () => Scenario;
  selectedSchema: () => TargetSchema;

  selectScenario: (id: string) => void;
  setSourceData: (fileName: string, fields: SourceField[], rows: SourceRow[]) => void;
  selectTargetSchema: (id: string) => void;
  runAutoMatch: () => void;

  openImportModal: () => void;
  closeImportModal: () => void;

  /**
   * Connects a source field to a target field, inferring the connection
   * type from what's already there: a target with an existing incoming
   * connection becomes a merge; a source already flowing elsewhere becomes
   * an additional split output; otherwise it's a plain direct connection.
   */
  connectFields: (sourceId: string, targetId: string) => void;

  updateConnection: (id: string, patch: Partial<Connection>) => void;
  removeConnection: (id: string) => void;
  removeSourceFromConnection: (connectionId: string, sourceId: string) => void;

  openEditCluster: (key: string) => void;
  closeEditCluster: () => void;

  setTemplate: (template: string) => void;
  setPreviewIndex: (index: number) => void;

  generateOutput: () => void;
  undoLastGeneration: () => void;
}

const initialScenario = SCENARIOS[0];
const initialSchema = initialScenario.targetSchemas[0];

export const useMapperStore = create<MapperState>((set, get) => ({
  scenarios: SCENARIOS,
  selectedScenarioId: initialScenario.id,

  sourceFileName: initialScenario.sourceFileName,
  sourceFields: initialScenario.sourceFields,
  sourceRows: initialScenario.sourceRows,

  targetSchemas: initialScenario.targetSchemas,
  selectedTargetSchemaId: initialSchema.id,

  connections: autoMatch(initialScenario.sourceFields, initialSchema),
  selectedTemplate: initialSchema.templates?.[0] ?? '',
  previewIndex: 0,

  isImportModalOpen: false,
  editingClusterKey: null,

  lastGeneratedBatch: null,

  selectedScenario: () => {
    const state = get();
    return state.scenarios.find((s) => s.id === state.selectedScenarioId) ?? state.scenarios[0];
  },
  selectedSchema: () => {
    const state = get();
    return (
      state.targetSchemas.find((s) => s.id === state.selectedTargetSchemaId) ??
      state.targetSchemas[0]
    );
  },

  selectScenario: (id) =>
    set((state) => {
      const scenario = state.scenarios.find((s) => s.id === id) ?? state.scenarios[0];
      const schema = scenario.targetSchemas[0];
      revokeBatchUrl(state.lastGeneratedBatch);
      return {
        selectedScenarioId: scenario.id,
        sourceFileName: scenario.sourceFileName,
        sourceFields: scenario.sourceFields,
        sourceRows: scenario.sourceRows,
        targetSchemas: scenario.targetSchemas,
        selectedTargetSchemaId: schema.id,
        connections: autoMatch(scenario.sourceFields, schema),
        selectedTemplate: schema.templates?.[0] ?? '',
        previewIndex: 0,
        lastGeneratedBatch: null,
        editingClusterKey: null,
      };
    }),

  setSourceData: (fileName, fields, rows) =>
    set((state) => ({
      sourceFileName: fileName,
      sourceFields: fields,
      sourceRows: rows,
      connections: autoMatch(fields, state.selectedSchema()),
      previewIndex: 0,
    })),

  selectTargetSchema: (id) =>
    set((state) => {
      const schema = state.targetSchemas.find((s) => s.id === id) ?? state.targetSchemas[0];
      return {
        selectedTargetSchemaId: id,
        connections: autoMatch(state.sourceFields, schema),
        selectedTemplate: schema.templates?.[0] ?? '',
        previewIndex: 0,
        editingClusterKey: null,
      };
    }),

  runAutoMatch: () =>
    set((state) => ({
      connections: autoMatch(state.sourceFields, state.selectedSchema()),
      previewIndex: 0,
      editingClusterKey: null,
    })),

  openImportModal: () => set({ isImportModalOpen: true }),
  closeImportModal: () => set({ isImportModalOpen: false }),

  connectFields: (sourceId, targetId) =>
    set((state) => {
      const alreadyConnected = state.connections.some(
        (c) => c.targetId === targetId && c.sourceIds.includes(sourceId),
      );
      if (alreadyConnected) return {};

      const targetConns = state.connections.filter((c) => c.targetId === targetId);
      if (targetConns.length > 0) {
        const merged: Connection = {
          id: makeConnectionId(),
          type: 'merge',
          sourceIds: [...new Set([...targetConns.flatMap((c) => c.sourceIds), sourceId])],
          targetId,
          mergeSeparator: ' ',
        };
        return {
          connections: [...state.connections.filter((c) => c.targetId !== targetId), merged],
        };
      }

      const sourceSplits = state.connections.filter(
        (c) => c.type === 'split' && c.sourceIds.includes(sourceId),
      );
      const sourceUsedElsewhere = state.connections.some((c) => c.sourceIds.includes(sourceId));
      if (sourceSplits.length > 0 || sourceUsedElsewhere) {
        return {
          connections: [
            ...state.connections,
            {
              id: makeConnectionId(),
              type: 'split',
              sourceIds: [sourceId],
              targetId,
              splitSeparators: [','],
              partIndex: sourceSplits.length,
            },
          ],
        };
      }

      return {
        connections: [
          ...state.connections,
          { id: makeConnectionId(), type: 'direct', sourceIds: [sourceId], targetId },
        ],
      };
    }),

  updateConnection: (id, patch) =>
    set((state) => ({
      connections: state.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    })),

  removeSourceFromConnection: (connectionId, sourceId) =>
    set((state) => {
      const conn = state.connections.find((c) => c.id === connectionId);
      if (!conn) return {};
      const remaining = conn.sourceIds.filter((id) => id !== sourceId);
      if (remaining.length === 0) {
        return { connections: state.connections.filter((c) => c.id !== connectionId) };
      }
      if (remaining.length === 1 && conn.type === 'merge') {
        return {
          connections: state.connections.map((c) =>
            c.id === connectionId ? { ...c, type: 'direct' as const, sourceIds: remaining } : c,
          ),
        };
      }
      return {
        connections: state.connections.map((c) =>
          c.id === connectionId ? { ...c, sourceIds: remaining } : c,
        ),
      };
    }),

  openEditCluster: (key) => set({ editingClusterKey: key }),
  closeEditCluster: () => set({ editingClusterKey: null }),

  setTemplate: (template) => set({ selectedTemplate: template }),
  setPreviewIndex: (index) =>
    set((state) => ({
      previewIndex: Math.max(0, Math.min(index, state.sourceRows.length - 1)),
    })),

  generateOutput: () =>
    set((state) => {
      const schema = state.selectedSchema();
      revokeBatchUrl(state.lastGeneratedBatch);

      if (schema.outputKind === 'csv') {
        const rows = state.sourceRows.map((row) => {
          const record = buildPreviewRecord(state.connections, row);
          return schema.fields.map((f) => record[f.id] ?? '');
        });
        const csv = Papa.unparse({ fields: schema.fields.map((f) => f.label), data: rows });
        const csvUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const slug = schema.label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const fileName = `${slug}.csv`;
        const previewRows = state.sourceRows.slice(0, 5).map((row) => {
          const record = buildPreviewRecord(state.connections, row);
          const obj: Record<string, string> = {};
          schema.fields.forEach((f) => {
            obj[f.label] = record[f.id] ?? '';
          });
          return obj;
        });
        return {
          lastGeneratedBatch: {
            outputKind: 'csv',
            schemaLabel: schema.label,
            fileName,
            rowCount: rows.length,
            csvUrl,
            previewRows,
            createdAt: Date.now(),
          },
        };
      }

      const nameField = schema.fields.find((f) => /name/i.test(f.label));
      const titles = state.sourceRows.map((row, i) => {
        if (nameField) {
          const conn = state.connections.find((c) => c.targetId === nameField.id);
          if (conn) {
            const value = resolveConnectionValue(conn, row);
            if (value.trim()) return value;
          }
        }
        return `${schema.label} #${i + 1}`;
      });
      return {
        lastGeneratedBatch: {
          outputKind: 'wordpress',
          schemaLabel: schema.label,
          titles,
          createdAt: Date.now(),
        },
      };
    }),

  undoLastGeneration: () =>
    set((state) => {
      revokeBatchUrl(state.lastGeneratedBatch);
      return { lastGeneratedBatch: null };
    }),
}));
