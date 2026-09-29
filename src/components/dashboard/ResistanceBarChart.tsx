'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ResistanceRate } from '@/types/database';

interface Props {
  data: ResistanceRate[];
  groupBy: 'organism' | 'antimicrobial';
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

function getColor(value: number): string {
  if (value >= 70) return '#ef4444';
  if (value >= 50) return '#f97316';
  if (value >= 30) return '#f59e0b';
  if (value >= 15) return '#84cc16';
  return '#22c55e';
}

interface ChartPayload {
  name: string;
  resistance_percentage: number;
  total_tested: number;
  resistant_count: number;
  susceptible_count: number;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as ChartPayload;

  return (
    <div className="glass-card p-3 text-sm shadow-xl !bg-surface-800/95">
      <p className="font-medium text-surface-100 mb-1">{label}</p>
      <div className="space-y-0.5 text-surface-300">
        <p>Resistance: <span className="font-semibold text-danger-400">{data.resistance_percentage}%</span></p>
        <p>Tested: <span className="font-medium text-surface-200">{data.total_tested}</span></p>
        <p>Resistant: <span className="text-danger-400">{data.resistant_count}</span></p>
        <p>Susceptible: <span className="text-accent-400">{data.susceptible_count}</span></p>
      </div>
    </div>
  );
}

export function ResistanceBarChart({ data, groupBy }: Props) {
  const chartData = data
    .slice(0, 15)
    .map((d) => ({
      name: groupBy === 'organism' ? d.organism : d.antimicrobial,
      resistance_percentage: d.resistance_percentage,
      total_tested: d.total_tested,
      resistant_count: d.resistant_count,
      susceptible_count: d.susceptible_count,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-500">
        No validated data available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          angle={-35}
          textAnchor="end"
          height={80}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          domain={[0, 100]}
          label={{
            value: 'Resistance %',
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 12, fill: '#64748b' },
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="resistance_percentage" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={getColor(entry.resistance_percentage)}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
