'use client';

import { AlertCircle, Calendar, Check, Clock, Flame, Trophy } from 'lucide-react';

const variants = {
  today: {
    className: 'athlete-badge-today',
    icon: Flame,
    label: 'Today',
  },
  completed: {
    className: 'athlete-badge-complete',
    icon: Check,
    label: 'Completed',
  },
  pr: {
    className: 'athlete-badge-pr',
    icon: Trophy,
    label: 'PR',
  },
  missed: {
    className: 'athlete-badge-missed',
    icon: AlertCircle,
    label: 'Missed',
  },
  upcoming: {
    className:
      'bg-[var(--athlete-bg-card)] text-[var(--athlete-text-muted)] border border-[var(--athlete-border)]',
    icon: Calendar,
    label: 'Upcoming',
  },
  live: {
    className:
      'bg-[var(--athlete-accent-primary)] text-[var(--athlete-on-accent)] animate-athlete-pulse',
    icon: Flame,
    label: 'Live',
  },
};

export default function StatusBadge({
  variant = 'upcoming',
  label,
  showIcon = true,
  className = '',
}) {
  const config = variants[variant] || variants.upcoming;
  const Icon = config.icon;
  const displayLabel = label || config.label;

  return (
    <span className={`athlete-badge ${config.className} ${className}`}>
      {showIcon && <Icon className="w-3 h-3" />}
      {displayLabel}
    </span>
  );
}
