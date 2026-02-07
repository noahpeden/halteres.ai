'use client';

export default function WeekDots({
  totalWeeks = 4,
  currentWeek = 1,
  completedWeeks = [],
  className = '',
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Array.from({ length: totalWeeks }, (_, i) => {
        const weekNumber = i + 1;
        const isCompleted = completedWeeks.includes(weekNumber);
        const isCurrent = weekNumber === currentWeek;

        return (
          <div
            key={weekNumber}
            className={`athlete-week-dot ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            title={`Week ${weekNumber}`}
          />
        );
      })}
    </div>
  );
}
