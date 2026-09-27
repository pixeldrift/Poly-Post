import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { useMapperStore } from '../store';
import type { SourceField, SourceRow } from '../types';
import { Modal } from './Modal';
import './ImportDataModal.css';

interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
}

export function ImportDataModal() {
  const isOpen = useMapperStore((s) => s.isImportModalOpen);
  const closeImportModal = useMapperStore((s) => s.closeImportModal);
  const setSourceData = useMapperStore((s) => s.setSourceData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const parseFile = (file: File) => {
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      preview: 500,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError('Could not read that file as CSV. Try exporting it as a plain .csv file.');
          return;
        }
        const headers = results.meta.fields ?? [];
        setParsed({ fileName: file.name, headers, rows: results.data });
      },
      error: (err) => setError(err.message),
    });
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    parseFile(file);
  };

  const handleImport = () => {
    if (!parsed) return;
    const fields: SourceField[] = parsed.headers.map((header, i) => ({
      id: `src-${header.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`,
      name: header,
      sampleValue: parsed.rows[0]?.[header] ?? '',
    }));
    const rows: SourceRow[] = parsed.rows.map((row) => {
      const sourceRow: SourceRow = {};
      fields.forEach((field, i) => {
        sourceRow[field.id] = row[parsed.headers[i]] ?? '';
      });
      return sourceRow;
    });
    setSourceData(parsed.fileName, fields, rows);
    setParsed(null);
    closeImportModal();
  };

  const handleClose = () => {
    setParsed(null);
    setError(null);
    closeImportModal();
  };

  return (
    <Modal title="Import Data" onClose={handleClose} width={560}>
      {!parsed ? (
        <>
          <div
            className={`import-dropzone${isDragOver ? ' is-drag-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <p className="import-dropzone-text">Drop a .csv file here</p>
            <p className="import-dropzone-or">or</p>
            <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
              Select Source
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          {error && <p className="import-error">{error}</p>}
          <div className="import-divider">
            <span>Or from a cloud service</span>
          </div>
          <div className="import-cloud-row">
            <button className="btn" disabled title="Coming soon">
              Google Drive
            </button>
            <button className="btn" disabled title="Coming soon">
              Dropbox
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="import-preview-heading">
            <strong>{parsed.fileName}</strong> — {parsed.rows.length} row
            {parsed.rows.length === 1 ? '' : 's'}, {parsed.headers.length} columns
          </p>
          <div className="import-preview-grid-wrap">
            <table className="import-preview-grid">
              <thead>
                <tr>
                  {parsed.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 6).map((row, i) => (
                  <tr key={i}>
                    {parsed.headers.map((h) => (
                      <td key={h}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="import-preview-footer">
            <button className="btn" onClick={() => setParsed(null)}>
              Back
            </button>
            <button className="btn btn-primary" onClick={handleImport}>
              Import
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
