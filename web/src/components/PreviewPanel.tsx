import { useMapperStore } from '../store';
import { renderPreviewCard } from '../engine/previewRender';
import './PreviewPanel.css';

export function PreviewPanel() {
  const schema = useMapperStore((s) => s.selectedSchema());
  const connections = useMapperStore((s) => s.connections);
  const sourceRows = useMapperStore((s) => s.sourceRows);
  const previewIndex = useMapperStore((s) => s.previewIndex);
  const setPreviewIndex = useMapperStore((s) => s.setPreviewIndex);
  const selectedTemplate = useMapperStore((s) => s.selectedTemplate);
  const setTemplate = useMapperStore((s) => s.setTemplate);

  const row = sourceRows[previewIndex];
  const card = row ? renderPreviewCard(schema, connections, row) : null;
  const isCompact = selectedTemplate.toLowerCase().includes('compact');
  const isList = /list row/i.test(selectedTemplate);

  return (
    <aside className="preview-panel card">
      <div className="preview-panel-header">
        <span className="preview-panel-title">Preview Results</span>
        <select
          className="select select-sm"
          value={selectedTemplate}
          onChange={(e) => setTemplate(e.target.value)}
        >
          {schema.templates.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="preview-panel-body">
        {card ? (
          isList ? (
            <div className="preview-list-row">
              <strong>{card.title}</strong>
              {card.subtitle && <span className="preview-list-sub">{card.subtitle}</span>}
              {card.detailLines.slice(0, 2).map((line) => (
                <span key={line.label} className="preview-list-sub">
                  {line.value}
                </span>
              ))}
            </div>
          ) : (
            <div className={`preview-card${isCompact ? ' is-compact' : ''}`}>
              <div className="preview-card-avatar" aria-hidden="true" />
              <div className="preview-card-body">
                <h3 className="preview-card-title">{card.title}</h3>
                {card.subtitle && <p className="preview-card-subtitle">from {card.subtitle}</p>}
                {card.detailLines.map((line) => (
                  <p key={line.label} className="preview-card-line">
                    {line.value}
                  </p>
                ))}
                {!isCompact && (
                  <p className="preview-card-lorem">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
                    tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                )}
              </div>
            </div>
          )
        ) : (
          <p className="preview-empty">No rows to preview yet. Import a source file to begin.</p>
        )}
      </div>

      {card && !isCompact && !isList && card.metaLines.length > 0 && (
        <div className="preview-meta">
          {card.metaLines.map((line) => (
            <span key={line.label} className="preview-meta-item">
              {line.label}: <em>{line.value}</em>
            </span>
          ))}
        </div>
      )}

      <div className="preview-pagination">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPreviewIndex(previewIndex - 1)}
          disabled={previewIndex <= 0}
          aria-label="Previous"
        >
          ‹
        </button>
        <span>
          Previewing {sourceRows.length === 0 ? 0 : previewIndex + 1} of {sourceRows.length}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPreviewIndex(previewIndex + 1)}
          disabled={previewIndex >= sourceRows.length - 1}
          aria-label="Next"
        >
          ›
        </button>
      </div>
    </aside>
  );
}
