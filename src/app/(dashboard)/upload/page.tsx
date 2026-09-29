'use client';

import { useActionState, useState, useRef } from 'react';
import { previewFileAction, processUploadAction, type UploadState } from './actions';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<UploadState | null>(null);

  const [previewState, previewAction, isPreviewing] = useActionState<UploadState, FormData>(
    previewFileAction,
    { step: 'idle' }
  );

  const handleMappingChange = (field: string, column: string) => {
    setMapping((prev) => ({ ...prev, [field]: column }));
  };

  const handleProcess = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    setProcessing(true);
    const formData = new FormData();
    formData.set('file', fileInputRef.current.files[0]);
    formData.set('mapping', JSON.stringify(mapping));

    const res = await processUploadAction(formData);
    setResult(res);
    setProcessing(false);
  };

  const requiredFields = [
    { key: 'organism', label: 'Organism', required: true },
    { key: 'antimicrobial', label: 'Antimicrobial', required: true },
    { key: 'result', label: 'Result (S/I/R)', required: true },
    { key: 'specimen', label: 'Specimen Type', required: false },
    { key: 'sample_date', label: 'Sample Date', required: false },
    { key: 'patient_age_group', label: 'Age Group', required: false },
    { key: 'ward', label: 'Ward', required: false },
  ];

  const canProcess =
    mapping.organism && mapping.antimicrobial && mapping.result && previewState.step === 'preview';

  // Show result screen
  if (result?.step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8 text-center fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-accent-400" />
          </div>
          <h2 className="text-2xl font-bold text-surface-100 mb-2">Upload Complete</h2>
          <p className="text-surface-400 mb-6">{result.fileName}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-800/50 rounded-lg p-4">
              <p className="text-2xl font-bold text-surface-100">{result.totalRows}</p>
              <p className="text-xs text-surface-500">Total Rows</p>
            </div>
            <div className="bg-accent-500/10 rounded-lg p-4">
              <p className="text-2xl font-bold text-accent-400">{result.validRows}</p>
              <p className="text-xs text-surface-500">Valid</p>
            </div>
            <div className="bg-danger-500/10 rounded-lg p-4">
              <p className="text-2xl font-bold text-danger-400">{result.errorRows}</p>
              <p className="text-xs text-surface-500">With Errors</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href="/review"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
            >
              Review Records <ArrowRight size={16} />
            </a>
            <button
              onClick={() => {
                setResult(null);
                setMapping({});
              }}
              className="px-6 py-2.5 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-lg font-medium transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100">Upload AST Data</h1>
        <p className="text-sm text-surface-400 mt-1">
          Upload CSV or Excel files containing antibiotic susceptibility testing results
        </p>
      </div>

      {/* Upload Zone */}
      <div className="glass-card p-8">
        <form action={previewAction}>
          <div className="border-2 border-dashed border-surface-700 hover:border-primary-500/50 rounded-xl p-8 text-center transition-colors duration-200">
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              id="file-upload"
              onChange={() => {
                const form = fileInputRef.current?.closest('form');
                if (form) {
                  const formData = new FormData(form);
                  previewAction(formData);
                }
              }}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary-500/10 flex items-center justify-center">
                {isPreviewing ? (
                  <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
                ) : (
                  <Upload className="w-7 h-7 text-primary-400" />
                )}
              </div>
              <p className="text-surface-200 font-medium mb-1">
                {isPreviewing ? 'Parsing file…' : 'Drop your file here or click to browse'}
              </p>
              <p className="text-surface-500 text-sm">CSV, XLS, or XLSX • Max 10MB</p>
            </label>
          </div>
        </form>
      </div>

      {/* Error */}
      {previewState.step === 'error' && (
        <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg px-4 py-3 text-danger-400 text-sm flex items-center gap-2 fade-in">
          <XCircle size={16} />
          {previewState.error}
        </div>
      )}

      {/* Preview + Mapping */}
      {previewState.step === 'preview' && previewState.headers && (
        <div className="space-y-6 fade-in">
          {/* File info */}
          <div className="glass-card p-4 flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-accent-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-surface-200">{previewState.fileName}</p>
              <p className="text-xs text-surface-500">
                {previewState.totalRows} rows • {((previewState.fileSize ?? 0) / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          {/* Column Mapping */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-surface-100 mb-1">Map Columns</h3>
            <p className="text-sm text-surface-400 mb-4">
              Match your file columns to the expected fields
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {requiredFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-surface-300 mb-1.5">
                    {field.label}
                    {field.required && <span className="text-danger-400 ml-0.5">*</span>}
                  </label>
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="w-full bg-surface-800/60 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
                  >
                    <option value="">— Select column —</option>
                    {previewState.headers!.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          <div className="glass-card p-6 overflow-x-auto">
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Data Preview</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700">
                  {previewState.headers!.map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-surface-400 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewState.previewRows!.map((row, i) => (
                  <tr key={i} className="border-b border-surface-800 hover:bg-surface-800/30">
                    {previewState.headers!.map((h) => (
                      <td key={h} className="py-2 px-3 text-surface-300 whitespace-nowrap">
                        {row[h] || <span className="text-surface-600">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Process Button */}
          <div className="flex justify-end">
            <button
              onClick={handleProcess}
              disabled={!canProcess || processing}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing {previewState.totalRows} rows…
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Process & Upload
                </>
              )}
            </button>
          </div>

          {!canProcess && !processing && (
            <div className="flex items-center gap-2 text-warning-400 text-sm">
              <AlertTriangle size={14} />
              Map the required columns (Organism, Antimicrobial, Result) before processing
            </div>
          )}
        </div>
      )}
    </div>
  );
}
