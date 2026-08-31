'use client';
import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const typeClass =
    {
      success: 'halt-toast-success',
      error: 'halt-toast-error',
      warning: 'halt-toast-warning',
      info: 'halt-toast-info',
    }[type] || 'halt-toast-info';

  return (
    <div className={`halt-toast ${typeClass}`} role="status">
      <p>{message}</p>
    </div>
  );
}
