import { useState, useEffect } from 'react';

export default function ReferenceWorkoutSearchModal({
  isOpen,
  onClose,
  onSelect,
  selectedWorkouts = [],
  initialSearchText = '',
}) {
  const [searchText, setSearchText] = useState(initialSearchText);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(selectedWorkouts);

  // Auto-search on open or when initialSearchText changes
  useEffect(() => {
    if (isOpen) {
      setSearchText(initialSearchText);
      if (initialSearchText && initialSearchText.trim().length > 0) {
        handleSearch(initialSearchText);
      } else {
        setResults([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialSearchText]);

  // Search function now accepts an argument for auto-search
  const handleSearch = async (overrideText) => {
    const query = overrideText !== undefined ? overrideText : searchText;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const res = await fetch('/api/search-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery: query }),
      });
      if (!res.ok) throw new Error('Failed to search workouts');
      const data = await res.json();
      setResults(data.workouts || []);
    } catch (e) {
      setError(e.message || 'Error searching workouts');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (workout) => {
    setSelected((prev) => {
      const exists = prev.find((w) => w.id === workout.id);
      if (exists) {
        return prev.filter((w) => w.id !== workout.id);
      } else {
        return [...prev, workout];
      }
    });
  };

  const handleConfirm = () => {
    onSelect(selected);
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open" open={isOpen}>
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-2">Search Reference Workouts</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="input input-bordered w-full border-base-300 focus:border-primary"
            placeholder="Search for workouts (e.g. Fran, EMOM, strength)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSearch()}
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              'Search'
            )}
          </button>
        </div>
        {error && <div className="text-error mb-2">{error}</div>}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && !loading && (
            <div className="text-sm text-gray-500">
              No workouts found. Try a different search.
            </div>
          )}
          <ul className="space-y-2">
            {results.map((workout) => (
              <li
                key={workout.id}
                className="border rounded-md p-3 flex items-start gap-3"
              >
                <input
                  type="checkbox"
                  className="checkbox mt-1"
                  checked={!!selected.find((w) => w.id === workout.id)}
                  onChange={() => handleToggle(workout)}
                  aria-label={`Select workout ${workout.title}`}
                />
                <div className="flex-1">
                  <div className="font-semibold">{workout.title}</div>
                  <div className="text-sm text-gray-700 whitespace-pre-line mb-1">
                    {workout.body?.slice(0, 200) || 'No description'}
                    {workout.body && workout.body.length > 200 && '...'}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(workout.tags)
                      ? workout.tags
                      : Object.values(workout.tags || {})
                    ).map((tag, i) => (
                      <span key={i} className="badge badge-outline badge-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="modal-action mt-4">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={selected.length === 0}
          >
            Add Selected ({selected.length})
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
