import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import {
  calculateResistanceRates,
  calculateResistanceTrends,
} from '@/lib/analytics/resistance';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardCharts } from './DashboardCharts';
import { Activity, FlaskConical, ShieldAlert, ClipboardCheck } from 'lucide-react';
import type { ASTRecord } from '@/types/database';

interface DashboardPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    organism?: string;
    antimicrobial?: string;
    specimen?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch validated AST records with filters
  let query = supabase
    .from('ast_records')
    .select('*')
    .eq('review_status', 'validated');

  if (params.dateFrom) {
    query = query.gte('sample_date', params.dateFrom);
  }
  if (params.dateTo) {
    query = query.lte('sample_date', params.dateTo);
  }
  if (params.organism) {
    query = query.eq('organism', params.organism);
  }
  if (params.antimicrobial) {
    query = query.eq('antimicrobial', params.antimicrobial);
  }
  if (params.specimen) {
    query = query.eq('specimen', params.specimen);
  }

  const { data: records = [] } = await query;
  const astRecords = (records ?? []) as ASTRecord[];

  // Also get total counts (unfiltered)
  const { count: totalRecords } = await supabase
    .from('ast_records')
    .select('*', { count: 'exact', head: true });

  const { count: pendingCount } = await supabase
    .from('ast_records')
    .select('*', { count: 'exact', head: true })
    .eq('review_status', 'pending');

  const { count: validatedCount } = await supabase
    .from('ast_records')
    .select('*', { count: 'exact', head: true })
    .eq('review_status', 'validated');

  // Get distinct values for filter dropdowns
  const { data: orgData } = await supabase
    .from('ast_records')
    .select('organism')
    .eq('review_status', 'validated')
    .not('organism', 'is', null);
  const organisms = [...new Set((orgData ?? []).map((r) => r.organism).filter(Boolean) as string[])].sort();

  const { data: abxData } = await supabase
    .from('ast_records')
    .select('antimicrobial')
    .eq('review_status', 'validated')
    .not('antimicrobial', 'is', null);
  const antimicrobials = [...new Set((abxData ?? []).map((r) => r.antimicrobial).filter(Boolean) as string[])].sort();

  const { data: specData } = await supabase
    .from('ast_records')
    .select('specimen')
    .eq('review_status', 'validated')
    .not('specimen', 'is', null);
  const specimens = [...new Set((specData ?? []).map((r) => r.specimen).filter(Boolean) as string[])].sort();

  // Compute analytics
  const resistanceRates = calculateResistanceRates(astRecords);
  const trends = calculateResistanceTrends(astRecords, params.organism, params.antimicrobial);

  // Count unique organisms with high resistance (>50%)
  const highResistanceCount = new Set(
    resistanceRates.filter((r) => r.resistance_percentage > 50 && r.total_tested >= 10).map((r) => r.organism)
  ).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100">AMR Dashboard</h1>
        <p className="text-sm text-surface-400 mt-1">
          Antimicrobial resistance surveillance overview
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Records"
          value={totalRecords ?? 0}
          subtitle="All uploaded AST records"
          icon={<Activity size={20} />}
          color="primary"
        />
        <StatCard
          title="Validated"
          value={validatedCount ?? 0}
          subtitle="Ready for analysis"
          icon={<ClipboardCheck size={20} />}
          color="accent"
        />
        <StatCard
          title="Pending Review"
          value={pendingCount ?? 0}
          subtitle="Awaiting validation"
          icon={<FlaskConical size={20} />}
          color="warning"
        />
        <StatCard
          title="High Resistance"
          value={highResistanceCount}
          subtitle="Organisms >50% R (n≥10)"
          icon={<ShieldAlert size={20} />}
          color="danger"
        />
      </div>

      {/* Charts + Filters (Client Component) */}
      <Suspense fallback={<div className="skeleton h-[500px]" />}>
        <DashboardCharts
          resistanceRates={resistanceRates}
          trends={trends}
          organisms={organisms}
          antimicrobials={antimicrobials}
          specimens={specimens}
          filters={params}
          hasData={astRecords.length > 0}
        />
      </Suspense>
    </div>
  );
}
