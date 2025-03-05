'use client';

import React, { useState } from 'react';

export default function ProgramOverview({ program, onUpdate }) {
  const [name, setName] = useState(program?.name || '');
  const [description, setDescription] = useState(program?.description || '');
  const [durationWeeks, setDurationWeeks] = useState(
    program?.duration_weeks || 4
  );
  const [focusArea, setFocusArea] = useState(program?.focus_area || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate({
      name,
      description,
      duration_weeks: durationWeeks,
      focus_area: focusArea,
    });
    setIsEditing(false);
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Program Overview</h2>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Program Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Duration (weeks)</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={durationWeeks}
                onChange={(e) =>
                  setDurationWeeks(parseInt(e.target.value) || 0)
                }
                min="1"
                max="52"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Focus Area</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                placeholder="e.g., Strength, Hypertrophy, Endurance"
              />
            </div>

            <div className="card-actions justify-end">
              <button className="btn btn-primary" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Name:</span> {name}
            </div>
            <div>
              <span className="font-semibold">Description:</span>{' '}
              {description || 'No description provided.'}
            </div>
            <div>
              <span className="font-semibold">Duration:</span> {durationWeeks}{' '}
              weeks
            </div>
            <div>
              <span className="font-semibold">Focus Area:</span>{' '}
              {focusArea || 'Not specified'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
