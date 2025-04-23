'use client';

// Simple Confirmation Modal Component
function ConfirmationModal({ isOpen, onClose, onConfirm, content }) {
  if (!isOpen) return null;

  return (
    <dialog
      id="confirmation_modal"
      className="modal modal-open modal-bottom sm:modal-middle"
      open={isOpen} // Ensure dialog is controlled by isOpen prop
    >
      <div className="modal-box">
        <h3 className="font-bold text-lg">
          {content?.title || 'Confirm Action'}
        </h3>
        <p className="py-4">{content?.message || 'Are you sure?'}</p>
        <div className="modal-action">
          <form method="dialog">
            {' '}
            {/* Allow closing via Escape key */}
            <button className="btn btn-sm btn-ghost mr-2" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-sm btn-primary" onClick={onConfirm}>
              {content?.confirmText || 'Confirm'}
            </button>
          </form>
        </div>
      </div>
      {/* Optional: Close modal when clicking backdrop */}
      {/* <form method="dialog" className="modal-backdrop">
         <button onClick={onClose}>close</button>
       </form> */}
    </dialog>
  );
}

export default ConfirmationModal;
