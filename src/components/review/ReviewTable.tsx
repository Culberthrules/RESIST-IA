'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Filter } from 'lucide-react';
import type { ASTRecordWithIssues } from '@/types/database';
import { QualityBadge } from './QualityBadge';
import {
  validateRecordsAction,
  excludeRecordsAction,
  validateCleanPendingAction,
} from '@/app/(dashboard)/review/actions';

interface ReviewTableProps {
  records: ASTRecordWithIssues[];
  uploadId?: string;
}

export function ReviewTable({ records, uploadId }: ReviewTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [issueFilter, setIssueFilter] = useState<'all' | 'errors' | 'warnings' | 'clean'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const issues = record.quality_issues ?? [];
      const hasError = issues.some((i) => i.severity === 'error');
      const hasWarning = issues.some((i) => i.severity === 'warning');

      switch (issueFilter) {
        case 'errors':
          return hasError;
        case 'warnings':
          return hasWarning && !hasError;
        case 'clean':
          return issues.length === 0;
        default:
          return true;
      }
    });
  }, [records, issueFilter]);

  const toggleAll = () => {
    if (selected.size === filteredRecords.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runAction = (action: () => Promise<{ error?: string; updated?: number }>) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      setMessage(`Updated ${result.updated ?? 0} record(s).`);
      router.refresh();
    });
  };

  const selectedIds = Array.from(selected);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-surface-400">
          <Filter size={16} />
          <span className="text-sm font-medium">Show</span>
        </div>
        {(['all', 'errors', 'warnings', 'clean'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setIssueFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              issueFilter === key
                ? 'bg-primary-500/20 text-primary-300'
                : 'bg-surface-800 text-surface-400 hover:text-surface-200'
            }`}
          >
            {key === 'all' ? 'All pending' : key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}

        <div className="flex flex-wrap gap-2 ml-auto">
          <button
            type="button"
            disabled={isPending}
            onClick={() => runAction(() => validateCleanPendingAction(uploadId))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-accent-500/15 text-accent-400 hover:bg-accent-500/25 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Validate clean rows
          </button>
          <button
            type="button"
            disabled={isPending || selectedIds.length === 0}
            onClick={() => runAction(() => validateRecordsAction(selectedIds))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50"
          >
            Validate selected
          </button>
          <button
            type="button"
            disabled={isPending || selectedIds.length === 0}
            onClick={() => runAction(() => excludeRecordsAction(selectedIds))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-danger-500/15 text-danger-400 hover:bg-danger-500/25 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Exclude selected
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-accent-500/10 border border-accent-500/20 rounded-lg px-4 py-3 text-accent-400 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg px-4 py-3 text-danger-400 text-sm">
          {error}
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700 text-surface-400">
              <th className="py-3 px-3 w-10">
                <input
                  type="checkbox"
                  checked={filteredRecords.length > 0 && selected.size === filteredRecords.length}
                  onChange={toggleAll}
                  className="rounded border-surface-600"
                />
              </th>
              <th className="text-left py-3 px-3 font-medium">Row</th>
              <th className="text-left py-3 px-3 font-medium">Organism</th>
              <th className="text-left py-3 px-3 font-medium">Antimicrobial</th>
              <th className="text-left py-3 px-3 font-medium">Result</th>
              <th className="text-left py-3 px-3 font-medium">Specimen</th>
              <th className="text-left py-3 px-3 font-medium">Issues</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-surface-500">
                  No pending records match this filter.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-surface-800 hover:bg-surface-800/30">
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={selected.has(record.id)}
                      onChange={() => toggleOne(record.id)}
                      className="rounded border-surface-600"
                    />
                  </td>
                  <td className="py-3 px-3 text-surface-400">{record.row_number}</td>
                  <td className="py-3 px-3 text-surface-200">{record.organism ?? record.raw_organism ?? '—'}</td>
                  <td className="py-3 px-3 text-surface-200">
                    {record.antimicrobial ?? record.raw_antimicrobial ?? '—'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-surface-100">{record.result ?? record.raw_result ?? '—'}</span>
                  </td>
                  <td className="py-3 px-3 text-surface-300">{record.specimen ?? record.raw_specimen ?? '—'}</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {(record.quality_issues ?? []).length === 0 ? (
                        <span className="text-xs text-accent-400">No issues</span>
                      ) : (
                        record.quality_issues.map((issue) => (
                          <QualityBadge
                            key={issue.id}
                            issueType={issue.issue_type}
                            severity={issue.severity}
                            title={issue.message}
                          />
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
