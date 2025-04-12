'use client';
import { useState, useEffect } from 'react';

export default function EditWorkoutModal({
  isOpen,
  workout,
  onClose,
  onSave,
  isLoading,
}) {
  const [editedWorkout, setEditedWorkout] = useState({
    title: '',
    body: '',
  });

  // Update editedWorkout when workout changes
  useEffect(() => {
    if (workout) {
      setEditedWorkout({
        title: workout.title || '',
        body: workout.body || workout.description || '',
      });
    }
  }, [workout]);

  if (!isOpen || !workout) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedWorkout((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...workout,
      title: editedWorkout.title,
      body: editedWorkout.body,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] p-4 pt-20"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white backdrop-blur-sm rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Edit Workout</h3>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={editedWorkout.title}
                onChange={handleChange}
                className="input input-bordered w-full"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                name="body"
                value={editedWorkout.body}
                onChange={handleChange}
                className="textarea textarea-bordered w-full h-96"
                required
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
