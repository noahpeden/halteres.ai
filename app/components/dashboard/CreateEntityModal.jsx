'use client';

export default function CreateEntityModal({
  isOpen,
  entityName,
  entityType,
  errorMessage,
  onEntityNameChange,
  onEntityTypeChange,
  onSubmit,
  onCancel,
}) {
  return (
    <>
      <input
        type="checkbox"
        id="create-entity-modal"
        className="modal-toggle"
        checked={isOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create New Profile/Class</h3>
          {errorMessage && (
            <div className="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
          <form onSubmit={onSubmit}>
            <div className="w-full mb-4">
              <label className="label">
                <span className="text-sm">Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter name"
                className="input input-bordered w-full"
                value={entityName}
                onChange={(e) => onEntityNameChange(e.target.value)}
                required
              />
            </div>

            <div className="w-full mb-4">
              <label className="label">
                <span className="text-sm">Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={entityType}
                onChange={(e) => onEntityTypeChange(e.target.value)}
              >
                <option value="CLIENT">Profile (Individual)</option>
                <option value="CLASS">Class (Group)</option>
              </select>
            </div>

            <div className="modal-action">
              <button type="button" onClick={onCancel} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create & Continue
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
