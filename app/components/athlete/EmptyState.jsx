'use client';

import { Dumbbell } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Dumbbell,
  title = 'Nothing here yet',
  message = 'Check back later for updates.',
  action,
  actionLabel,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-[var(--athlete-bg-card)] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--athlete-text-muted)]" />
      </div>

      <h3 className="athlete-heading-md mb-2">{title}</h3>
      <p className="athlete-body text-[var(--athlete-text-secondary)] max-w-xs mb-6">{message}</p>

      {action && actionLabel && (
        <button onClick={action} className="athlete-btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
