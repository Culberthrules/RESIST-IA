'use client';

import { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import type { AISummaryResponse } from '@/lib/ai/types';

interface AISummaryProps {
  dateFrom?: string;
  dateTo?: string;
  organism?: string;
  antimicrobial?: string;
  hasData: boolean;
}

export function AISummary({ dateFrom, dateTo, organism, antimicrobial, hasData }: AISummaryProps) {
  const [summary, setSummary] = useState<AISummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (organism) params.set('organism', organism);
      if (antimicrobial) params.set('antimicrobial', antimicrobial);

      const res = await fetch(`/api/ai-summary?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate summary');
      }

      const data: AISummaryResponse = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-surface-100">AI Summary</h3>
        </div>
        <button
          onClick={generateSummary}
          disabled={loading || !hasData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-primary-600 hover:from-purple-500 hover:to-primary-500 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Summary
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-surface-500 mb-4 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        AI receives only pre-computed aggregates from validated records. No clinical recommendations are provided.
      </p>

      {error && (
        <div className="bg-danger-500/10 border border-danger-500/20 rounded-lg px-4 py-3 text-danger-400 text-sm mb-4">
          {error}
        </div>
      )}

      {summary && (
        <div className="space-y-4 fade-in">
          {/* Main summary */}
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-surface-300 leading-relaxed text-sm">
              {summary.summary}
            </div>
          </div>

          {/* Key findings */}
          {summary.key_findings.length > 0 && (
            <div className="bg-primary-500/5 border border-primary-500/10 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-primary-400 mb-2">Key Findings</h4>
              <ul className="space-y-1.5">
                {summary.key_findings.map((finding, i) => (
                  <li key={i} className="text-sm text-surface-300 flex gap-2">
                    <span className="text-primary-500 mt-1">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Limitations */}
          {summary.limitations.length > 0 && (
            <div className="bg-warning-500/5 border border-warning-500/10 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-warning-400 mb-2">Limitations</h4>
              <ul className="space-y-1.5">
                {summary.limitations.map((limitation, i) => (
                  <li key={i} className="text-sm text-surface-400 flex gap-2">
                    <span className="text-warning-500 mt-1">•</span>
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-surface-600">
            Generated at {new Date(summary.generated_at).toLocaleString()}
          </p>
        </div>
      )}

      {!summary && !loading && !error && (
        <div className="text-center py-8 text-surface-500 text-sm">
          {hasData
            ? 'Click "Generate Summary" to create an AI-powered analysis of your validated data.'
            : 'Upload and validate some AST data first to generate an AI summary.'}
        </div>
      )}
    </div>
  );
}
