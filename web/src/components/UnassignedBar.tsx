import { useMapperStore } from '../store';
import './UnassignedBar.css';

export function UnassignedBar() {
  const sourceFields = useMapperStore((s) => s.sourceFields);
  const schema = useMapperStore((s) => s.selectedSchema());
  const connections = useMapperStore((s) => s.connections);

  const connectedSourceIds = new Set(connections.flatMap((c) => c.sourceIds));
  const connectedTargetIds = new Set(connections.map((c) => c.targetId));

  const unassignedSources = sourceFields.filter((f) => !connectedSourceIds.has(f.id));
  const unassignedTargets = schema.fields.filter((f) => !connectedTargetIds.has(f.id));

  return (
    <div className="unassigned-bar">
      <div className="unassigned-group">
        <span className="unassigned-label">Unassigned Imported Fields</span>
        <div className="unassigned-chips">
          {unassignedSources.length === 0 ? (
            <span className="unassigned-empty">All imported fields are connected</span>
          ) : (
            unassignedSources.map((f) => (
              <span key={f.id} className="chip" style={{ cursor: 'default' }}>
                {f.name}
              </span>
            ))
          )}
        </div>
      </div>
      <div className="unassigned-group">
        <span className="unassigned-label">Unassigned Post Fields</span>
        <div className="unassigned-chips">
          {unassignedTargets.length === 0 ? (
            <span className="unassigned-empty">All post fields are connected</span>
          ) : (
            unassignedTargets.map((f) => (
              <span key={f.id} className="chip" style={{ cursor: 'default' }}>
                {f.label}
                {f.required && <span className="field-required">*</span>}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
