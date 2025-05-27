'use client';

export default function EntitySelectionModal({
  isOpen,
  entities,
  selectedEntityId,
  onEntitySelect,
  onCreateNew,
  onContinue,
  onCancel,
}) {
  return (
    <>
      <input
        type="checkbox"
        id="entity-selection-modal"
        className="modal-toggle"
        checked={isOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Select Client/Class</h3>

          {entities.length > 0 ? (
            <div className="w-full mb-6">
              <label className="label">
                <span className="text-sm">Choose a Client or Class</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedEntityId}
                onChange={(e) => onEntitySelect(e.target.value)}
              >
                <option value="" disabled>
                  Select a client or class
                </option>
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
          ) : (
            <p className="text-center py-4 mb-4">
              No clients or classes yet. Create your first one below.
            </p>
          )}

          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Or create a new client/class:
            </span>
            <button onClick={onCreateNew} className="btn btn-sm btn-outline">
              Create New
            </button>
          </div>

          <div className="modal-action">
            <button onClick={onCancel} className="btn btn-outline">
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectedEntityId}
              onClick={onContinue}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
