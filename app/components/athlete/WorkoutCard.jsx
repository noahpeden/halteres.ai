'use client';

import { ChevronRight, Clock, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';

export default function WorkoutCard({
  id,
  title,
  scheduledDate,
  result,
  status = 'upcoming',
  weekNumber,
  dayNumber,
  showArrow = true,
  className = '',
}) {
  const stripeClass =
    {
      today: 'athlete-stripe-today',
      completed: 'athlete-stripe-complete',
      missed: 'athlete-stripe-missed',
      upcoming: 'athlete-stripe-upcoming',
    }[status] || 'athlete-stripe-upcoming';

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const displayTitle = title || `Week ${weekNumber || '?'}, Day ${dayNumber || '?'}`;
  const formattedDate = formatDate(scheduledDate);

  const content = (
    <div className={`athlete-card ${stripeClass} p-4 flex items-center gap-4 ${className}`}>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--athlete-bg-secondary)] flex items-center justify-center">
        <Dumbbell className="w-5 h-5 text-[var(--athlete-text-muted)]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="athlete-heading-md text-white truncate">{displayTitle}</h3>
          {status === 'today' && <StatusBadge variant="today" />}
          {result?.is_pr && <StatusBadge variant="pr" />}
        </div>

        <div className="flex items-center gap-3 text-[var(--athlete-text-secondary)]">
          {formattedDate && (
            <span className="athlete-body flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
          )}
          {result && (
            <span className="athlete-body text-[var(--athlete-accent-complete)]">
              {result.result_type === 'time' && result.result_value}
              {result.result_type === 'reps' && `${result.result_value} reps`}
              {result.result_type === 'weight' && `${result.result_value} lbs`}
              {result.result_type === 'rounds' && `${result.result_value} rounds`}
            </span>
          )}
        </div>
      </div>

      {showArrow && (
        <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)] flex-shrink-0" />
      )}
    </div>
  );

  if (id) {
    return (
      <Link href={`/athlete/workout/${id}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
