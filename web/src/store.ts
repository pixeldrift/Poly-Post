import { create } from 'zustand';
import type { Connection, PostTypeSchema, SourceField, SourceRow } from './types';
import { EMPLOYEE_POST_TYPE, POST_TYPES, SOURCE_FIELDS, SOURCE_ROWS } from './data/mockData';
import { autoMatch, makeConnectionId } from './engine/match';
import { resolveConnectionValue } from './engine/transform';

export interface GeneratedBatch {
  postType: string;
  titles: string[];
  createdAt: number;
}

interface MapperState {
  sourceFileName: string;
  sourceFields: SourceField[];
  sourceRows: SourceRow[];

  postTypes: PostTypeSchema[];
  selectedPostTypeId: string;

  connections: Connection[];
  selectedTemplate: string;
  previewIndex: number;

  isImportModalOpen: boolean;
  editingConnectionId: string | null;

  lastGeneratedBatch: GeneratedBatch | null;

  selectedSchema: () => PostTypeSchema;

  setSourceData: (fileName: string, fields: SourceField[], rows: SourceRow[]) => void;
  selectPostType: (id: string) => void;
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

  openEditConnection: (id: string) => void;
  closeEditConnection: () => void;

  setTemplate: (template: string) => void;
  setPreviewIndex: (index: number) => void;

  generatePosts: () => void;
  undoLastGeneration: () => void;
}

export const useMapperStore = create<MapperState>((set, get) => ({
  sourceFileName: 'employee-directory.csv',
  sourceFields: SOURCE_FIELDS,
  sourceRows: SOURCE_ROWS,

  postTypes: POST_TYPES,
  selectedPostTypeId: EMPLOYEE_POST_TYPE.id,

  connections: autoMatch(SOURCE_FIELDS, EMPLOYEE_POST_TYPE),
  selectedTemplate: EMPLOYEE_POST_TYPE.templates[0],
  previewIndex: 0,

  isImportModalOpen: false,
  editingConnectionId: null,

  lastGeneratedBatch: null,

  selectedSchema: () => {
    const state = get();
    return state.postTypes.find((p) => p.id === state.selectedPostTypeId) ?? state.postTypes[0];
  },

  setSourceData: (fileName, fields, rows) =>
    set((state) => ({
      sourceFileName: fileName,
      sourceFields: fields,
      sourceRows: rows,
      connections: autoMatch(fields, state.selectedSchema()),
      previewIndex: 0,
    })),

  selectPostType: (id) =>
    set((state) => {
      const schema = state.postTypes.find((p) => p.id === id) ?? state.postTypes[0];
      return {
        selectedPostTypeId: id,
        connections: autoMatch(state.sourceFields, schema),
        selectedTemplate: schema.templates[0],
        previewIndex: 0,
      };
    }),

  runAutoMatch: () =>
    set((state) => ({
      connections: autoMatch(state.sourceFields, state.selectedSchema()),
      previewIndex: 0,
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
      editingConnectionId: state.editingConnectionId === id ? null : state.editingConnectionId,
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

  openEditConnection: (id) => set({ editingConnectionId: id }),
  closeEditConnection: () => set({ editingConnectionId: null }),

  setTemplate: (template) => set({ selectedTemplate: template }),
  setPreviewIndex: (index) =>
    set((state) => ({
      previewIndex: Math.max(0, Math.min(index, state.sourceRows.length - 1)),
    })),

  generatePosts: () =>
    set((state) => {
      const schema = state.selectedSchema();
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
        lastGeneratedBatch: { postType: schema.label, titles, createdAt: Date.now() },
      };
    }),

  undoLastGeneration: () => set({ lastGeneratedBatch: null }),
}));
