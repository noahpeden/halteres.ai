'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  suffix = '',
  highlight = false,
  className = '',
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-[var(--athlete-accent-complete)]'
      : trend === 'down'
        ? 'text-red-500'
        : 'text-[var(--athlete-text-muted)]';

  return (
    <div
      className={`athlete-card-static p-4 ${highlight ? 'border-[var(--athlete-accent-primary)] bg-[var(--athlete-accent-primary)]/5' : ''} ${className}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="athlete-label">{label}</span>
        {Icon && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${highlight ? 'bg-[var(--athlete-accent-primary)]/10' : 'bg-[var(--athlete-bg-secondary)]'}`}
          >
            <Icon
              className={`w-4 h-4 ${highlight ? 'text-[var(--athlete-accent-primary)]' : 'text-[var(--athlete-text-muted)]'}`}
            />
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className="athlete-heading-xl animate-number-pop">
          {value}
          {suffix && (
            <span className="text-lg ml-1 text-[var(--athlete-text-muted)]">{suffix}</span>
          )}
        </span>

        {trend && (
          <span className={`flex items-center gap-1 text-sm mb-1 ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
