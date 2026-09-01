'use client';

import { useEffect, useState } from 'react';
import { isAthleteFileFilled, normalizeAthleteFile } from '@/utils/prompt-builder/athleteFile.js';

const FIELDS = [
  { name: 'squat_lb', label: 'Squat', suffix: 'lb', min: 1, max: 2000 },
  { name: 'bench_lb', label: 'Bench', suffix: 'lb', min: 1, max: 2000 },
  { name: 'deadlift_lb', label: 'Deadlift', suffix: 'lb', min: 1, max: 2000 },
  { name: 'bodyweight_lb', label: 'Bodyweight', suffix: 'lb', min: 50, max: 800 },
  { name: 'days_per_week', label: 'Days / week', suffix: 'days', min: 1, max: 7 },
  { name: 'session_minutes', label: 'Session', suffix: 'min', min: 15, max: 240 },
];

function fieldValue(file, name) {
  const value = file?.[name];
  return value == null ? '' : String(value);
}

function summaryBits(file) {
  const bits = [];
  if (file.squat_lb) bits.push(`Squat ${file.squat_lb}`);
  if (file.bench_lb) bits.push(`Bench ${file.bench_lb}`);
  if (file.deadlift_lb) bits.push(`Deadlift ${file.deadlift_lb}`);
  if (file.bodyweight_lb) bits.push(`${file.bodyweight_lb} lb`);
  if (file.days_per_week) bits.push(`${file.days_per_week} days/week`);
  if (file.session_minutes) bits.push(`${file.session_minutes} min`);
  return bits;
}

export default function AthleteFileCard({
  athleteFile,
  variant = 'writer',
  compact = false,
  editing = false,
  saving = false,
  showSkip = false,
  onEdit,
  onCancelEdit,
  onSave,
  onSkip,
}) {
  const filled = isAthleteFileFilled(athleteFile);
  const [draft, setDraft] = useState(() => normalizeAthleteFile(athleteFile));

  useEffect(() => {
    setDraft(normalizeAthleteFile(athleteFile));
  }, [athleteFile, editing]);

  const handleChange = (name, value) => {
    setDraft((prev) => ({ ...prev, [name]: value === '' ? null : value }));
  };

  const handleSave = () => {
    onSave?.(normalizeAthleteFile({ ...draft, skipped: false }));
  };

  if (compact && !editing) {
    if (filled) {
      return (
        <div className="rounded-sm border border-[var(--paper-rule)] bg-[var(--paper)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="athlete-label mb-1">Your numbers</p>
              <p className="athlete-body text-sm text-[var(--ink)]">
                {summaryBits(draft).join(' · ')}
              </p>
              {draft.injuries ? (
                <p className="mt-1 text-xs text-[var(--ink-soft)] line-clamp-2">{draft.injuries}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="min-h-11 px-4 athlete-btn-secondary text-sm"
              onClick={onEdit}
            >
              Edit
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-sm border border-dashed border-[var(--clay-deep)] bg-[var(--paper)] p-3">
        <p className="athlete-label mb-1">Your numbers are missing</p>
        <p className="athlete-body text-sm mb-3">Loads stay generic until you add maxes.</p>
        <button type="button" className="athlete-btn-primary min-h-12 w-full" onClick={onEdit}>
          Add your numbers
        </button>
      </div>
    );
  }

  return (
    <section
      className={`rounded-sm border bg-[var(--paper)] ${
        filled
          ? 'border-[var(--paper-rule)] p-4'
          : 'border-[var(--clay-deep)] p-5 shadow-[0_0_0_3px_rgba(158,64,32,0.12)]'
      }`}
    >
      <p className="athlete-label mb-2">{filled ? 'Your numbers' : 'Add your numbers'}</p>
      <h3 className="athlete-heading-lg mb-2">
        {variant === 'profile' ? 'What you lift' : 'Programs read these first.'}
      </h3>
      <p className="athlete-body mb-5 max-w-xl">
        {filled
          ? 'Squat, bench, deadlift, bodyweight, days, and session time stay on you — every new program starts from here.'
          : 'Write your squat, bench, deadlift, bodyweight, days, and session time. Skip is fine — generate still works — but loads stay guesswork until you add them.'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FIELDS.map((field) => (
          <label key={field.name} className="block">
            <span className="writer-field-label">{field.label}</span>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                className="writer-field min-h-12 pr-12 text-base"
                value={fieldValue(draft, field.name)}
                onChange={(event) => handleChange(field.name, event.target.value)}
                placeholder={field.suffix === 'days' ? '4' : field.suffix === 'min' ? '60' : ''}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider text-[var(--ink-mute)]">
                {field.suffix}
              </span>
            </div>
          </label>
        ))}
      </div>

      <label className="block mt-4">
        <span className="writer-field-label">Injuries / limitations</span>
        <textarea
          className="writer-field min-h-20 resize-none text-base"
          value={draft.injuries || ''}
          onChange={(event) => handleChange('injuries', event.target.value)}
          placeholder="Optional. Cranky left knee, no overhead, etc."
          maxLength={400}
        />
      </label>

      <div className="flex flex-col sm:flex-row gap-2 mt-5">
        <button
          type="button"
          className="athlete-btn-primary min-h-12 flex-1"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : filled ? 'Save your numbers' : 'Add your numbers'}
        </button>
        {filled && onCancelEdit ? (
          <button
            type="button"
            className="athlete-btn-secondary min-h-12 px-5"
            onClick={onCancelEdit}
            disabled={saving}
          >
            Cancel
          </button>
        ) : null}
        {showSkip && !filled ? (
          <button
            type="button"
            className="min-h-12 px-5 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
            onClick={onSkip}
            disabled={saving}
          >
            Skip for now
          </button>
        ) : null}
      </div>
    </section>
  );
}
