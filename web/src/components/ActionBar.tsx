import { useState } from 'react';
import { useMapperStore } from '../store';
import './ActionBar.css';

const DRAFT_KEY = 'polypost.draft';

export function ActionBar() {
  const connections = useMapperStore((s) => s.connections);
  const selectedTemplate = useMapperStore((s) => s.selectedTemplate);
  const selectedPostTypeId = useMapperStore((s) => s.selectedPostTypeId);
  const runAutoMatch = useMapperStore((s) => s.runAutoMatch);
  const generatePosts = useMapperStore((s) => s.generatePosts);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleCancel = () => {
    if (window.confirm('Discard your current field connections and reset to auto-match?')) {
      runAutoMatch();
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ connections, selectedTemplate, selectedPostTypeId, savedAt: Date.now() }),
    );
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

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
        <button className="btn btn-primary" onClick={generatePosts}>
          Generate Posts
        </button>
      </div>
    </div>
  );
}
