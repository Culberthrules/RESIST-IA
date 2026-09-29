'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ResistanceTrend } from '@/types/database';

interface Props {
  data: ResistanceTrend[];
}

const LINE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-card p-3 text-sm shadow-xl !bg-surface-800/95">
      <p className="font-medium text-surface-100 mb-2">{label}</p>
      <div className="space-y-1">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-surface-300">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="truncate max-w-[140px]">{entry.name}:</span>
            <span className="font-semibold text-surface-100">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResistanceTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-500">
        No trend data available (requires sample dates)
      </div>
    );
  }

  // Pivot: group by organism-antimicrobial, each becomes a line
  const seriesMap = new Map<string, Map<string, number>>();
  const allPeriods = new Set<string>();

  for (const d of data) {
    const key = `${d.organism} / ${d.antimicrobial}`;
    allPeriods.add(d.period);
    if (!seriesMap.has(key)) {
      seriesMap.set(key, new Map());
    }
    seriesMap.get(key)!.set(d.period, d.resistance_percentage);
  }

  const periods = Array.from(allPeriods).sort();
  const seriesKeys = Array.from(seriesMap.keys()).slice(0, 8); // Limit to 8 lines

  const chartData = periods.map((period) => {
    const point: Record<string, string | number> = { period };
    for (const key of seriesKeys) {
      point[key] = seriesMap.get(key)?.get(period) ?? 0;
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
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
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
          iconType="circle"
          iconSize={8}
        />
        {seriesKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 2 }}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
