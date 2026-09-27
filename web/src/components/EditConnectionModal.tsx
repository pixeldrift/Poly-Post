import { useMapperStore } from '../store';
import { connectionResultPreview, splitValue } from '../engine/transform';
import type { ConnectionType } from '../types';
import { Modal } from './Modal';
import './EditConnectionModal.css';

const TYPE_OPTIONS: { type: ConnectionType; label: string; glyph: string }[] = [
  { type: 'direct', label: 'Direct', glyph: '→' },
  { type: 'merge', label: 'Merge', glyph: '⇥' },
  { type: 'split', label: 'Split', glyph: '⇉' },
];

export function EditConnectionModal() {
  const editingConnectionId = useMapperStore((s) => s.editingConnectionId);
  const connections = useMapperStore((s) => s.connections);
  const sourceFields = useMapperStore((s) => s.sourceFields);
  const schema = useMapperStore((s) => s.selectedSchema());
  const closeEditConnection = useMapperStore((s) => s.closeEditConnection);
  const updateConnection = useMapperStore((s) => s.updateConnection);
  const removeConnection = useMapperStore((s) => s.removeConnection);
  const removeSourceFromConnection = useMapperStore((s) => s.removeSourceFromConnection);

  const connection = connections.find((c) => c.id === editingConnectionId);
  if (!connection) return null;

  const targetField = schema.fields.find((f) => f.id === connection.targetId);
  const sourceById = (id: string) => sourceFields.find((f) => f.id === id);
  const resultPreview = connectionResultPreview(connection, sourceFields);

  const firstSourceSample = sourceById(connection.sourceIds[0])?.sampleValue ?? '';
  const splitParts =
    connection.type === 'split'
      ? splitValue(firstSourceSample, connection.splitSeparators ?? [','])
      : [];

  return (
    <Modal title="Edit Connection" onClose={closeEditConnection}>
      <div className="edit-connection">
        <p className="edit-connection-summary">
          {connection.sourceIds.map((id) => sourceById(id)?.name).join(' + ')}
          {' → '}
          {targetField?.label ?? 'Unknown field'}
        </p>

        <div className="edit-connection-section">
          <span className="edit-connection-label">Connection Type</span>
          <div className="connection-type-row">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                className={`connection-type-btn${connection.type === opt.type ? ' is-active' : ''}`}
                disabled={opt.type === 'merge' && connection.sourceIds.length < 2}
                onClick={() => {
                  if (opt.type === 'direct' && connection.sourceIds.length > 1) {
                    updateConnection(connection.id, {
                      type: 'direct',
                      sourceIds: [connection.sourceIds[0]],
                    });
                  }
                }}
                title={opt.label}
              >
                <span aria-hidden="true">{opt.glyph}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {connection.type === 'merge' && (
          <div className="edit-connection-section">
            <span className="edit-connection-label">Merged Fields</span>
            <div className="merge-chip-row">
              {connection.sourceIds.map((id) => (
                <span key={id} className="chip">
                  {sourceById(id)?.name}
                  <button
                    className="chip-remove"
                    onClick={() => removeSourceFromConnection(connection.id, id)}
                    aria-label={`Remove ${sourceById(id)?.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <label className="edit-connection-inline-label">
              Join with:
              <input
                type="text"
                className="text-input separator-input"
                value={connection.mergeSeparator ?? ' '}
                onChange={(e) => updateConnection(connection.id, { mergeSeparator: e.target.value })}
                placeholder="separator, e.g. a space"
              />
            </label>
          </div>
        )}

        {connection.type === 'split' && (
          <div className="edit-connection-section">
            <span className="edit-connection-label">Text Separators</span>
            {(connection.splitSeparators ?? ['']).map((sep, i) => (
              <div className="separator-row" key={i}>
                <input
                  type="text"
                  className="text-input separator-input"
                  value={sep}
                  onChange={(e) => {
                    const next = [...(connection.splitSeparators ?? [''])];
                    next[i] = e.target.value;
                    updateConnection(connection.id, { splitSeparators: next });
                  }}
                  placeholder="e.g. , or space"
                />
                {(connection.splitSeparators?.length ?? 0) > 1 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const next = (connection.splitSeparators ?? []).filter((_, j) => j !== i);
                      updateConnection(connection.id, { splitSeparators: next });
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
            <button
              className="btn btn-ghost btn-sm add-separator-btn"
              onClick={() =>
                updateConnection(connection.id, {
                  splitSeparators: [...(connection.splitSeparators ?? ['']), ''],
                })
              }
            >
              + Add Another Split
            </button>

            {splitParts.length > 1 && (
              <label className="edit-connection-inline-label">
                Use part:
                <select
                  className="select select-sm"
                  value={connection.partIndex ?? 0}
                  onChange={(e) =>
                    updateConnection(connection.id, { partIndex: Number(e.target.value) })
                  }
                >
                  {splitParts.map((part, i) => (
                    <option key={i} value={i}>
                      Part {i + 1}: “{part || '(empty)'}”
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <div className="edit-connection-section">
          <span className="edit-connection-label">Result Preview</span>
          <div className="result-preview-box">{resultPreview || <em>(no value)</em>}</div>
        </div>

        <div className="edit-connection-footer">
          <button
            className="btn btn-ghost"
            onClick={() => {
              removeConnection(connection.id);
              closeEditConnection();
            }}
          >
            Remove Connection
          </button>
          <div className="edit-connection-footer-right">
            <button className="btn" onClick={closeEditConnection}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={closeEditConnection}>
              Update
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
