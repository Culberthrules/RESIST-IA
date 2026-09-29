'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Search } from 'lucide-react';

interface FilterBarProps {
  organisms: string[];
  antimicrobials: string[];
  specimens: string[];
}

export function FilterBar({ organisms, antimicrobials, specimens }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  const selectClass =
    'bg-surface-800/60 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all appearance-none cursor-pointer';

  return (
    <div className="glass-card p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-surface-400">
        <Search size={16} />
        <span className="text-sm font-medium">Filters</span>
      </div>

      <div className="h-5 w-px bg-surface-700" />

      <input
        type="date"
        value={searchParams.get('dateFrom') ?? ''}
        onChange={(e) => updateFilter('dateFrom', e.target.value)}
        className={selectClass}
        title="From date"
      />
      <span className="text-surface-500 text-sm">to</span>
      <input
        type="date"
        value={searchParams.get('dateTo') ?? ''}
        onChange={(e) => updateFilter('dateTo', e.target.value)}
        className={selectClass}
        title="To date"
      />

      <div className="h-5 w-px bg-surface-700" />

      <select
        value={searchParams.get('organism') ?? ''}
        onChange={(e) => updateFilter('organism', e.target.value)}
        className={selectClass}
      >
        <option value="">All Organisms</option>
        {organisms.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      <select
        value={searchParams.get('antimicrobial') ?? ''}
        onChange={(e) => updateFilter('antimicrobial', e.target.value)}
        className={selectClass}
      >
        <option value="">All Antimicrobials</option>
        {antimicrobials.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <select
        value={searchParams.get('specimen') ?? ''}
        onChange={(e) => updateFilter('specimen', e.target.value)}
        className={selectClass}
      >
        <option value="">All Specimens</option>
        {specimens.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {searchParams.toString() && (
        <button
          onClick={() => router.push('/dashboard')}
          className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors ml-auto"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
