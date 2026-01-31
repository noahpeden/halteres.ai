'use client';

export default function DeleteProgramModal({ isOpen, isDeleting, onConfirm, onCancel }) {
  return (
    <>
      <input
        type="checkbox"
        id="delete-program-modal"
        className="modal-toggle"
        checked={isOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Delete Program</h3>
          <p className="mb-6">
            Are you sure you want to delete this program? This will also delete all associated
            workouts and cannot be undone.
          </p>
          <div className="modal-action">
            <button onClick={onCancel} className="btn btn-outline">
              Cancel
            </button>
            <button className="btn btn-error" onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs mr-2"></span>
              ) : null}
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
