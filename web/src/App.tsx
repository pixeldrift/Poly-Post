import { useMapperStore } from './store';
import { Logo } from './components/Logo';
import { MapperCanvas } from './components/MapperCanvas';
import { PreviewPanel } from './components/PreviewPanel';
import { UnassignedBar } from './components/UnassignedBar';
import { ActionBar } from './components/ActionBar';
import { ImportDataModal } from './components/ImportDataModal';
import { EditConnectionModal } from './components/EditConnectionModal';
import { GenerateResultModal } from './components/GenerateResultModal';
import './App.css';

function App() {
  const postTypes = useMapperStore((s) => s.postTypes);
  const selectedPostTypeId = useMapperStore((s) => s.selectedPostTypeId);
  const selectPostType = useMapperStore((s) => s.selectPostType);
  const sourceFileName = useMapperStore((s) => s.sourceFileName);
  const openImportModal = useMapperStore((s) => s.openImportModal);
  const runAutoMatch = useMapperStore((s) => s.runAutoMatch);
  const rowCount = useMapperStore((s) => s.sourceRows.length);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <Logo />
          <span className="app-title">Poly Post</span>
          <span className="app-subtitle">Multi-Post Import</span>
        </div>
        <div className="app-header-controls">
          <label className="field-label" htmlFor="post-type-select">
            Post Type
          </label>
          <select
            id="post-type-select"
            className="select"
            value={selectedPostTypeId}
            onChange={(e) => selectPostType(e.target.value)}
          >
            {postTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="app-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-file">
            <strong>Source:</strong> {sourceFileName} <em>({rowCount} rows)</em>
          </span>
          <button className="btn btn-sm" onClick={openImportModal}>
            Change Source
          </button>
        </div>
        <div className="toolbar-group">
          <button className="btn btn-sm" onClick={runAutoMatch}>
            Auto-Match Fields
          </button>
        </div>
      </div>

      <main className="app-main">
        <MapperCanvas />
        <PreviewPanel />
      </main>

      <footer className="app-footer">
        <UnassignedBar />
        <ActionBar />
      </footer>

      <ImportDataModal />
      <EditConnectionModal />
      <GenerateResultModal />
    </div>
  );
}

export default App;
