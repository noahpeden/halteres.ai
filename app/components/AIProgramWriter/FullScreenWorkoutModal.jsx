'use client';

import { X } from 'lucide-react';

export default function FullScreenWorkoutModal({ workout, isOpen, onClose }) {
  if (!isOpen || !workout) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col z-50">
      <div className="flex flex-col w-full h-full">
        <div
          className="flex justify-between items-center p-6 border-b border-gray-200 bg-white w-full"
          style={{ minHeight: '64px' }}
        >
          <h2 className="text-3xl font-bold truncate max-w-[80vw] text-gray-900">
            {workout.title || 'Workout'}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-lg btn-circle btn-ghost text-gray-700 hover:bg-gray-200"
            aria-label="Close full screen view"
          >
            <X className="h-8 w-8" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-white flex flex-col items-center justify-center">
          <div className="prose max-w-3xl w-full text-2xl leading-relaxed text-gray-900 whitespace-pre-line">
            {workout.body || workout.description || 'No details available.'}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-primary text-lg px-8 py-3"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
