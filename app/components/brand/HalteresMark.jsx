export default function HalteresMark({ className = 'w-10 h-10', title = 'Halteres' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect x="4" y="4" width="40" height="40" rx="3" fill="var(--clay-deep, #9E4020)" />
      <ellipse cx="16.5" cy="24" rx="6.2" ry="8.4" fill="var(--chalk, #FFF8F0)" />
      <ellipse cx="31.5" cy="24" rx="6.2" ry="8.4" fill="var(--chalk, #FFF8F0)" />
      <rect x="16" y="21.4" width="16" height="5.2" rx="1" fill="var(--ink, #1C1710)" />
    </svg>
  );
}
