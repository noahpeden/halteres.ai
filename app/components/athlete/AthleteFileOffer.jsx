'use client';

import { useState } from 'react';
import { normalizeAthleteFile } from '@/utils/prompt-builder/athleteFile.js';

export default function AthleteFileOffer({ offers = [], athleteFile, onUpdated, onDismiss }) {
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState('');

  if (!offers.length) return null;

  const accept = async (offer) => {
    if (savingKey) return;
    setSavingKey(offer.key);
    setError('');
    try {
      const next = normalizeAthleteFile({
        ...athleteFile,
        [offer.key]: offer.loggedLb,
        updated_at: new Date().toISOString(),
      });
      const response = await fetch('/api/athlete/athlete-file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Could not update your numbers');
      }
      onUpdated?.(normalizeAthleteFile(data.athleteFile || next), offer.key);
    } catch (err) {
      setError(err.message || 'Could not update your numbers');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="athlete-card-static athlete-glow-subtle p-5 space-y-3">
      <div>
        <p className="athlete-label mb-1">New top set</p>
        <h3 className="athlete-heading-md">That beat the number on your file.</h3>
        <p className="athlete-body mt-1">We will not overwrite Your numbers unless you say so.</p>
      </div>
      {offers.map((offer) => (
        <div
          key={offer.key}
          className="flex items-center justify-between gap-3 border-t border-[var(--athlete-border)] pt-3"
        >
          <div>
            <p className="athlete-heading-md">{offer.label}</p>
            <p className="athlete-label mt-0.5">
              File {offer.fileLb} lb → logged {offer.loggedLb} lb
            </p>
          </div>
          <button
            type="button"
            className="athlete-btn-primary text-sm py-2 px-4"
            disabled={Boolean(savingKey)}
            onClick={() => accept(offer)}
          >
            {savingKey === offer.key ? 'Saving…' : 'Update file'}
          </button>
        </div>
      ))}
      {error ? (
        <p className="text-sm text-[var(--blood)]" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="athlete-btn-secondary w-full" onClick={onDismiss}>
        Not now
      </button>
    </div>
  );
}
