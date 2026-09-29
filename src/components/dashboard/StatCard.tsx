'use client';

import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: number; label: string };
  color?: 'primary' | 'accent' | 'warning' | 'danger';
}

const colorMap = {
  primary: {
    bg: 'from-primary-500/15 to-primary-600/5',
    icon: 'bg-primary-500/15 text-primary-400',
    border: 'border-primary-500/10',
  },
  accent: {
    bg: 'from-accent-500/15 to-accent-600/5',
    icon: 'bg-accent-500/15 text-accent-400',
    border: 'border-accent-500/10',
  },
  warning: {
    bg: 'from-warning-500/15 to-warning-600/5',
    icon: 'bg-warning-500/15 text-warning-400',
    border: 'border-warning-500/10',
  },
  danger: {
    bg: 'from-danger-500/15 to-danger-600/5',
    icon: 'bg-danger-500/15 text-danger-400',
    border: 'border-danger-500/10',
  },
};

export function StatCard({ title, value, subtitle, icon, trend, color = 'primary' }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${colors.bg} border ${colors.border} hover:scale-[1.02] transition-transform duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-surface-100 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-surface-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${
              trend.value >= 0 ? 'text-accent-400' : 'text-danger-400'
            }`}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-surface-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
