import { useMapperStore } from '../store';
import { Modal } from './Modal';
import './GenerateResultModal.css';

export function GenerateResultModal() {
  const batch = useMapperStore((s) => s.lastGeneratedBatch);
  const undoLastGeneration = useMapperStore((s) => s.undoLastGeneration);

  if (!batch) return null;

  if (batch.outputKind === 'csv') {
    const columns = Object.keys(batch.previewRows[0] ?? {});
    return (
      <Modal title="CSV Ready" onClose={undoLastGeneration} width={560}>
        <p className="generate-summary">
          Converted <strong>{batch.rowCount}</strong> rows into "{batch.schemaLabel}" format.
        </p>
        {batch.previewRows.length > 0 && (
          <div className="generate-csv-preview-wrap">
            <table className="generate-csv-preview">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batch.previewRows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c}>{row[c]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="generate-undo-hint">
          Showing the first {batch.previewRows.length} of {batch.rowCount} rows.
        </p>
        <div className="generate-footer">
          <button className="btn" onClick={undoLastGeneration}>
            Close
          </button>
          <a className="btn btn-primary" href={batch.csvUrl} download={batch.fileName}>
            Download {batch.fileName}
          </a>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Posts Generated" onClose={undoLastGeneration} width={480}>
      <p className="generate-summary">
        Created <strong>{batch.titles.length}</strong> new "{batch.schemaLabel}" posts from your
        mapped data.
      </p>
      <ul className="generate-list">
        {batch.titles.map((title, i) => (
          <li key={i}>{title}</li>
        ))}
      </ul>
      <p className="generate-undo-hint">Your most recent import is remembered if you want to undo this later.</p>
      <div className="generate-footer">
        <button className="btn" onClick={undoLastGeneration}>
          Undo Last Import
        </button>
        <button className="btn btn-primary" onClick={undoLastGeneration}>
          Done
        </button>
      </div>
    </Modal>
  );
}
