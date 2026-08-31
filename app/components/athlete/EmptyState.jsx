'use client';

import { Dumbbell } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Dumbbell,
  title = 'Nothing here yet',
  message = 'Check back later.',
  action,
  actionLabel,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-sm bg-[var(--paper-deep)] flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-[var(--clay-deep)]" strokeWidth={1.5} />
        </div>
      )}

      <h3
        className="mb-2 text-[var(--ink)]"
        style={{ fontFamily: 'var(--halt-display)', fontSize: '1.5rem', fontWeight: 600 }}
      >
        {title}
      </h3>
      <p className="athlete-body max-w-xs mb-6">{message}</p>

      {action && actionLabel && (
        <button onClick={action} className="athlete-btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
