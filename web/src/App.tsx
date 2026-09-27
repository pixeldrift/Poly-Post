import { useMapperStore } from './store';
import { Logo } from './components/Logo';
import { MapperCanvas } from './components/MapperCanvas';
import { PreviewPanel } from './components/PreviewPanel';
import { ActionBar } from './components/ActionBar';
import { ImportDataModal } from './components/ImportDataModal';
import { EditConnectionModal } from './components/EditConnectionModal';
import { GenerateResultModal } from './components/GenerateResultModal';
import './App.css';

function App() {
  const scenarios = useMapperStore((s) => s.scenarios);
  const selectedScenarioId = useMapperStore((s) => s.selectedScenarioId);
  const selectScenario = useMapperStore((s) => s.selectScenario);
  const scenario = useMapperStore((s) => s.selectedScenario());

  const targetSchemas = useMapperStore((s) => s.targetSchemas);
  const selectedTargetSchemaId = useMapperStore((s) => s.selectedTargetSchemaId);
  const selectTargetSchema = useMapperStore((s) => s.selectTargetSchema);

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
          <span className="app-subtitle">{scenario.label}</span>
        </div>
        <div className="app-header-controls">
          <label className="field-label" htmlFor="scenario-select">
            Scenario
          </label>
          <select
            id="scenario-select"
            className="select"
            value={selectedScenarioId}
            onChange={(e) => selectScenario(e.target.value)}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {targetSchemas.length > 1 && (
            <>
              <label className="field-label" htmlFor="target-schema-select">
                Target
              </label>
              <select
                id="target-schema-select"
                className="select"
                value={selectedTargetSchemaId}
                onChange={(e) => selectTargetSchema(e.target.value)}
              >
                {targetSchemas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </header>

      <p className="app-scenario-description">{scenario.description}</p>

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
        <ActionBar />
      </footer>

      <ImportDataModal />
      <EditConnectionModal />
      <GenerateResultModal />
    </div>
  );
}

export default App;
