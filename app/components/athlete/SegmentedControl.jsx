'use client';

export default function SegmentedControl({ options = [], value, onChange, className = '' }) {
  return (
    <div className={`athlete-segmented ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`athlete-segmented-item ${value === option.value ? 'active' : ''}`}
        >
          {option.icon && <option.icon className="w-4 h-4 inline-block mr-1.5" />}
          {option.label}
        </button>
      ))}
    </div>
  );
}
