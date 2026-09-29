'use client';

import { FilterBar } from '@/components/dashboard/FilterBar';
import { ResistanceBarChart } from '@/components/dashboard/ResistanceBarChart';
import { ResistanceTrendChart } from '@/components/dashboard/ResistanceTrendChart';
import { AISummary } from '@/components/dashboard/AISummary';
import type { ResistanceRate, ResistanceTrend } from '@/types/database';

interface DashboardChartsProps {
  resistanceRates: ResistanceRate[];
  trends: ResistanceTrend[];
  organisms: string[];
  antimicrobials: string[];
  specimens: string[];
  filters: {
    dateFrom?: string;
    dateTo?: string;
    organism?: string;
    antimicrobial?: string;
    specimen?: string;
  };
  hasData: boolean;
}

export function DashboardCharts({
  resistanceRates,
  trends,
  organisms,
  antimicrobials,
  specimens,
  filters,
  hasData,
}: DashboardChartsProps) {
  // Aggregate by organism (sum across antimicrobials)
  const byOrganism = aggregateByField(resistanceRates, 'organism');
  // Aggregate by antimicrobial (sum across organisms)
  const byAntimicrobial = aggregateByField(resistanceRates, 'antimicrobial');

  return (
    <div className="space-y-6">
      {/* Filters */}
      <FilterBar
        organisms={organisms}
        antimicrobials={antimicrobials}
        specimens={specimens}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Resistance by Organism */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-surface-100 mb-4">
            Resistance by Organism
          </h3>
          <ResistanceBarChart data={byOrganism} groupBy="organism" />
        </div>

        {/* Resistance by Antimicrobial */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-surface-100 mb-4">
            Resistance by Antimicrobial
          </h3>
          <ResistanceBarChart data={byAntimicrobial} groupBy="antimicrobial" />
        </div>
      </div>

      {/* Trend Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-surface-100 mb-4">
          Resistance Trends Over Time
        </h3>
        <ResistanceTrendChart data={trends} />
      </div>

      {/* AI Summary */}
      <AISummary
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        organism={filters.organism}
        antimicrobial={filters.antimicrobial}
        hasData={hasData}
      />
    </div>
  );
}

/**
 * Aggregate resistance rates by a single field (organism or antimicrobial).
 * Sums up all tested/resistant/intermediate/susceptible across the other dimension.
 */
function aggregateByField(
  rates: ResistanceRate[],
  field: 'organism' | 'antimicrobial'
): ResistanceRate[] {
  const groups = new Map<string, {
    total: number;
    resistant: number;
    intermediate: number;
    susceptible: number;
  }>();

  for (const r of rates) {
    const key = r[field];
    if (!groups.has(key)) {
      groups.set(key, { total: 0, resistant: 0, intermediate: 0, susceptible: 0 });
    }
    const g = groups.get(key)!;
    g.total += r.total_tested;
    g.resistant += r.resistant_count;
    g.intermediate += r.intermediate_count;
    g.susceptible += r.susceptible_count;
  }

  return Array.from(groups.entries())
    .map(([key, g]) => ({
      organism: field === 'organism' ? key : '',
      antimicrobial: field === 'antimicrobial' ? key : '',
      total_tested: g.total,
      resistant_count: g.resistant,
      intermediate_count: g.intermediate,
      susceptible_count: g.susceptible,
      resistance_percentage: g.total > 0 ? Math.round((g.resistant / g.total) * 10000) / 100 : 0,
      confidence_interval_lower: 0,
      confidence_interval_upper: 0,
    }))
    .sort((a, b) => b.resistance_percentage - a.resistance_percentage);
}
