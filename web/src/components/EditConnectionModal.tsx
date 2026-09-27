import { useState } from 'react';
import { useMapperStore } from '../store';
import { connectionResultPreview, splitValue } from '../engine/transform';
import { computeClusters } from '../engine/layout';
import type { Connection, ConnectionFormat } from '../types';
import { Modal } from './Modal';
import './EditConnectionModal.css';

const FORMAT_OPTIONS: { value: ConnectionFormat | 'none'; label: string }[] = [
  { value: 'none', label: 'No formatting' },
  { value: 'phone', label: 'Phone number — (555) 123-4567' },
  { value: 'titlecase', label: 'Title Case' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'trim', label: 'Trim whitespace' },
];

function FormatSelect({
  value,
  onChange,
}: {
  value: ConnectionFormat | undefined;
  onChange: (format: ConnectionFormat | undefined) => void;
}) {
  return (
    <select
      className="select select-sm"
      value={value ?? 'none'}
      onChange={(e) => onChange(e.target.value === 'none' ? undefined : (e.target.value as ConnectionFormat))}
    >
      {FORMAT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function AddFieldPicker({
  label,
  options,
  onAdd,
}: {
  label: string;
  options: { id: string; name: string }[];
  onAdd: (id: string) => void;
}) {
  const [selected, setSelected] = useState('');
  if (options.length === 0) return null;
  return (
    <div className="add-field-picker">
      <select
        className="select select-sm"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
      <button
        className="btn btn-sm"
        disabled={!selected}
        onClick={() => {
          if (selected) {
            onAdd(selected);
            setSelected('');
          }
        }}
      >
        Add
      </button>
    </div>
  );
}

export function EditConnectionModal() {
  const editingClusterKey = useMapperStore((s) => s.editingClusterKey);
  const connections = useMapperStore((s) => s.connections);
  const sourceFields = useMapperStore((s) => s.sourceFields);
  const schema = useMapperStore((s) => s.selectedSchema());
  const closeEditCluster = useMapperStore((s) => s.closeEditCluster);
  const connectFields = useMapperStore((s) => s.connectFields);
  const updateConnection = useMapperStore((s) => s.updateConnection);
  const removeConnection = useMapperStore((s) => s.removeConnection);
  const removeSourceFromConnection = useMapperStore((s) => s.removeSourceFromConnection);

  const clusters = computeClusters(connections, sourceFields, schema.fields);
  const cluster = clusters.find((c) => c.key === editingClusterKey);
  if (!cluster) return null;

  const sourceById = (id: string) => sourceFields.find((f) => f.id === id);
  const targetById = (id: string) => schema.fields.find((f) => f.id === id);
  const clusterConnections = cluster.connectionIds
    .map((id) => connections.find((c) => c.id === id))
    .filter((c): c is Connection => Boolean(c));

  const connectedSourceIds = new Set(connections.flatMap((c) => c.sourceIds));
  const connectedTargetIds = new Set(connections.map((c) => c.targetId));
  const unconnectedSources = sourceFields
    .filter((f) => !connectedSourceIds.has(f.id))
    .map((f) => ({ id: f.id, name: f.name }));
  const unconnectedTargets = schema.fields
    .filter((f) => !connectedTargetIds.has(f.id))
    .map((f) => ({ id: f.id, name: f.label }));

  const title =
    cluster.kind === 'split'
      ? 'Edit Split'
      : cluster.kind === 'merge'
        ? 'Edit Merge'
        : 'Edit Connection';

  return (
    <Modal title={title} onClose={closeEditCluster} width={cluster.kind === 'split' ? 560 : 420}>
      <div className="edit-connection">
        {cluster.kind === 'split' ? (
          <SplitClusterEditor
            sourceField={sourceById(cluster.sourceIds[0])}
            connections={clusterConnections}
            targetById={targetById}
            unconnectedTargets={unconnectedTargets}
            onUpdate={updateConnection}
            onRemoveBranch={removeConnection}
            onAddTarget={(targetId) => connectFields(cluster.sourceIds[0], targetId)}
          />
        ) : (
          <DirectOrMergeEditor
            cluster={cluster}
            connection={clusterConnections[0]}
            sourceById={sourceById}
            targetById={targetById}
            sourceFields={sourceFields}
            unconnectedSources={unconnectedSources}
            unconnectedTargets={unconnectedTargets}
            onUpdate={updateConnection}
            onRemove={removeConnection}
            onRemoveSource={removeSourceFromConnection}
            onAddMergeSource={(sourceId) => connectFields(sourceId, cluster.targetIds[0])}
            onAddSplitTarget={(targetId) => connectFields(cluster.sourceIds[0], targetId)}
          />
        )}

        <div className="edit-connection-footer">
          <div />
          <button className="btn btn-primary" onClick={closeEditCluster}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DirectOrMergeEditor({
  connection,
  sourceById,
  targetById,
  sourceFields,
  unconnectedSources,
  unconnectedTargets,
  onUpdate,
  onRemove,
  onRemoveSource,
  onAddMergeSource,
  onAddSplitTarget,
}: {
  cluster: ReturnType<typeof computeClusters>[number];
  connection: Connection;
  sourceById: (id: string) => { name: string } | undefined;
  targetById: (id: string) => { label: string } | undefined;
  sourceFields: { id: string; name: string; sampleValue: string }[];
  unconnectedSources: { id: string; name: string }[];
  unconnectedTargets: { id: string; name: string }[];
  onUpdate: (id: string, patch: Partial<Connection>) => void;
  onRemove: (id: string) => void;
  onRemoveSource: (connectionId: string, sourceId: string) => void;
  onAddMergeSource: (sourceId: string) => void;
  onAddSplitTarget: (targetId: string) => void;
}) {
  const resultPreview = connectionResultPreview(connection, sourceFields);
  const targetField = targetById(connection.targetId);
  const isMerge = connection.type === 'merge';

  return (
    <>
      <p className="edit-connection-summary">
        {connection.sourceIds.map((id) => sourceById(id)?.name).join(' + ')}
        {' → '}
        {targetField?.label ?? 'Unknown field'}
      </p>

      {isMerge && (
        <div className="edit-connection-section">
          <span className="edit-connection-label">Merged Fields</span>
          <div className="merge-chip-row">
            {connection.sourceIds.map((id) => (
              <span key={id} className="chip">
                {sourceById(id)?.name}
                <button
                  className="chip-remove"
                  onClick={() => onRemoveSource(connection.id, id)}
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
              onChange={(e) => onUpdate(connection.id, { mergeSeparator: e.target.value })}
              placeholder="separator, e.g. a space"
            />
          </label>
        </div>
      )}

      <div className="edit-connection-section">
        <span className="edit-connection-label">
          {isMerge ? 'Merge Another Field In' : 'Merge Another Field In / Split To Another Target'}
        </span>
        <AddFieldPicker
          label="Merge in a field…"
          options={unconnectedSources}
          onAdd={onAddMergeSource}
        />
        {!isMerge && (
          <AddFieldPicker
            label="Also send to another target…"
            options={unconnectedTargets}
            onAdd={onAddSplitTarget}
          />
        )}
      </div>

      <div className="edit-connection-section">
        <span className="edit-connection-label">Format Output As</span>
        <FormatSelect
          value={connection.format}
          onChange={(format) => onUpdate(connection.id, { format })}
        />
      </div>

      <div className="edit-connection-section">
        <span className="edit-connection-label">Result Preview</span>
        <div className="result-preview-box">{resultPreview || <em>(no value)</em>}</div>
      </div>

      <button className="btn btn-ghost remove-connection-btn" onClick={() => onRemove(connection.id)}>
        Remove Connection
      </button>
    </>
  );
}

function SplitClusterEditor({
  sourceField,
  connections,
  targetById,
  unconnectedTargets,
  onUpdate,
  onRemoveBranch,
  onAddTarget,
}: {
  sourceField: { name: string; sampleValue: string } | undefined;
  connections: Connection[];
  targetById: (id: string) => { label: string } | undefined;
  unconnectedTargets: { id: string; name: string }[];
  onUpdate: (id: string, patch: Partial<Connection>) => void;
  onRemoveBranch: (id: string) => void;
  onAddTarget: (targetId: string) => void;
}) {
  const shared = connections[0];
  const separators = shared?.splitSeparators ?? [','];
  const sampleValue = sourceField?.sampleValue ?? '';
  const parts = splitValue(sampleValue, separators);

  const setSeparatorsOnAll = (next: string[]) => {
    for (const conn of connections) onUpdate(conn.id, { splitSeparators: next });
  };

  return (
    <>
      <p className="edit-connection-summary">Splitting "{sourceField?.name}" into {connections.length} fields</p>

      <div className="edit-connection-section">
        <span className="edit-connection-label">Text Separators</span>
        {separators.map((sep, i) => (
          <div className="separator-row" key={i}>
            <input
              type="text"
              className="text-input separator-input"
              value={sep}
              onChange={(e) => {
                const next = [...separators];
                next[i] = e.target.value;
                setSeparatorsOnAll(next);
              }}
              placeholder="e.g. , or space"
            />
            {separators.length > 1 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSeparatorsOnAll(separators.filter((_, j) => j !== i))}
              >
                Delete
              </button>
            )}
          </div>
        ))}
        <button
          className="btn btn-ghost btn-sm add-separator-btn"
          onClick={() => setSeparatorsOnAll([...separators, ''])}
        >
          + Add Another Split
        </button>
      </div>

      <div className="edit-connection-section">
        <span className="edit-connection-label">Split Into</span>
        {connections.map((conn) => (
          <div className="split-branch-row" key={conn.id}>
            <span className="split-branch-target">{targetById(conn.targetId)?.label}</span>
            <select
              className="select select-sm"
              value={conn.partIndex ?? 0}
              onChange={(e) => onUpdate(conn.id, { partIndex: Number(e.target.value) })}
            >
              {parts.map((part, i) => (
                <option key={i} value={i}>
                  Part {i + 1}: “{part || '(empty)'}”
                </option>
              ))}
            </select>
            <FormatSelect value={conn.format} onChange={(format) => onUpdate(conn.id, { format })} />
            <button
              className="chip-remove split-branch-remove"
              onClick={() => onRemoveBranch(conn.id)}
              aria-label={`Remove ${targetById(conn.targetId)?.label}`}
            >
              ×
            </button>
          </div>
        ))}
        <AddFieldPicker
          label="Also split into…"
          options={unconnectedTargets}
          onAdd={onAddTarget}
        />
      </div>
    </>
  );
}
