'use client';

export default function ProgramFilter({ entities, filterEntityId, onFilterChange }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex justify-between items-center w-full">
        <h2 className="text-xl font-semibold">Your Programs</h2>
        <div className="flex items-center gap-4">
          <div className="w-full">
            <label className="label">
              <span className="text-sm">Filter by Class or Client</span>
            </label>
            <select
              className="select select-bordered select-sm"
              value={filterEntityId}
              onChange={(e) => onFilterChange(e.target.value)}
            >
              <option value="all">All Programs</option>
              <optgroup label="Clients">
                {entities
                  .filter((entity) => entity.type === 'CLIENT')
                  .map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Classes">
                {entities
                  .filter((entity) => entity.type === 'CLASS')
                  .map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
