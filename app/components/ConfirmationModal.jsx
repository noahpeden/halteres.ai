'use client';
import React from 'react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isConfirming = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        <p className="py-4">{message}</p>
        <div className="modal-action">
          <button onClick={onClose} className="btn btn-outline">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`btn btn-error ${isConfirming ? 'loading' : ''}`}
            disabled={isConfirming}
          >
            {isConfirming ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
      {/* Optional: Click outside to close (if desired) */}
      {/* <label className="modal-backdrop" htmlFor="confirmation-modal-checkbox" onClick={onClose}>Close</label> */}
      {/* Need a hidden checkbox if using the label method for closing */}
    </div>
  );
};

export default ConfirmationModal;
