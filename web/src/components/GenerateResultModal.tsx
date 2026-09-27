import { useMapperStore } from '../store';
import { Modal } from './Modal';
import './GenerateResultModal.css';

export function GenerateResultModal() {
  const batch = useMapperStore((s) => s.lastGeneratedBatch);
  const undoLastGeneration = useMapperStore((s) => s.undoLastGeneration);

  if (!batch) return null;

  return (
    <Modal title="Posts Generated" onClose={undoLastGeneration} width={480}>
      <p className="generate-summary">
        Created <strong>{batch.titles.length}</strong> new "{batch.postType}" posts from your
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
