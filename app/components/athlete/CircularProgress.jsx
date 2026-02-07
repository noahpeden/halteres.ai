'use client';

export default function CircularProgress({
  value = 0,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showLabel = true,
  labelText,
  className = '',
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--athlete-border)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#athleteProgressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 6px var(--athlete-accent-glow))',
          }}
        />
        <defs>
          <linearGradient id="athleteProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--athlete-accent-primary)" />
            <stop offset="100%" stopColor="var(--athlete-accent-secondary)" />
          </linearGradient>
        </defs>
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="athlete-heading-lg">{Math.round(percentage)}%</span>
          {labelText && <span className="athlete-label mt-1">{labelText}</span>}
        </div>
      )}
    </div>
  );
}
