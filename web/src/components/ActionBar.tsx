import { useState } from 'react';
import { useMapperStore } from '../store';
import './ActionBar.css';

const DRAFT_KEY = 'polypost.draft';

export function ActionBar() {
  const connections = useMapperStore((s) => s.connections);
  const selectedTemplate = useMapperStore((s) => s.selectedTemplate);
  const selectedTargetSchemaId = useMapperStore((s) => s.selectedTargetSchemaId);
  const schema = useMapperStore((s) => s.selectedSchema());
  const runAutoMatch = useMapperStore((s) => s.runAutoMatch);
  const generateOutput = useMapperStore((s) => s.generateOutput);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleCancel = () => {
    if (window.confirm('Discard your current field connections and reset to auto-match?')) {
      runAutoMatch();
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ connections, selectedTemplate, selectedTargetSchemaId, savedAt: Date.now() }),
    );
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

  const generateLabel = schema.outputKind === 'csv' ? 'Export CSV' : 'Generate Posts';

  return (
    <div className="action-bar">
      <span className="action-bar-notice">{savedNotice ? 'Draft saved.' : ''}</span>
      <div className="action-bar-buttons">
        <button className="btn" onClick={handleCancel}>
          Cancel
        </button>
        <button className="btn" onClick={handleSaveDraft}>
          Save Draft
        </button>
        <button className="btn btn-primary" onClick={generateOutput}>
          {generateLabel}
        </button>
      </div>
    </div>
  );
}
