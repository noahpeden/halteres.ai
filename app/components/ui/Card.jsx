'use client';
import React, { useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

/**
 * @typedef {Object} Entity
 * @property {string} id
 * @property {string} user_id
 * @property {string} name
 * @property {string} description
 * @property {string} created_at
 * @property {string} updated_at
 * @property {'CLASS' | 'CLIENT'} type
 * @property {number|null} bench_1rm
 * @property {number|null} deadlift_1rm
 * @property {number|null} squat_1rm
 * @property {number|null} mile_time
 * @property {string|null} gender
 * @property {number|null} height_cm
 * @property {number|null} weight_kg
 */

/**
 * @typedef {Object} Program
 * @property {string} id
 * @property {string} name
 * @property {string} description
 */

/**
 * @typedef {Object} BaseCardProps
 * @property {(id: string) => Promise<void>} onDelete
 */

/**
 * @typedef {Object} EntityCardProps
 * @property {'entity'} type
 * @property {Entity} item
 */

/**
 * @typedef {Object} ProgramCardProps
 * @property {'program'} type
 * @property {Program} item
 * @property {string} entityId
 */

/**
 * @typedef {EntityCardProps & BaseCardProps | ProgramCardProps & BaseCardProps} CardProps
 */

/**
 * Card component for displaying entities or programs
 * @param {CardProps} props
 */
export default function Card({ item, type, onDelete, entityId }) {
  const modalRef = useRef(null);

  const getDescription = () => {
    if (type === 'entity') {
      return typeof item.description === 'string'
        ? item.description
        : item.type === 'CLASS'
        ? 'Class'
        : `Client since ${new Date(item.created_at).toLocaleDateString(
            'en-US',
            {
              month: 'short',
              year: 'numeric',
            }
          )}`;
    }
    return item.description || 'No description available';
  };

  const getNavigationPath = () => {
    if (type === 'entity') {
      return `/entity/${item.id}`;
    }
    return `/entity/${entityId}/program/${item.id}`;
  };

  const getDeleteMessage = () => {
    if (type === 'entity') {
      return 'This will permanently delete the entity and all associated programs.';
    }
    return 'This will permanently delete the program and all associated workouts.';
  };

  const handleDelete = async () => {
    await onDelete(item.id);
    // Close the modal after deletion
    if (modalRef.current) {
      modalRef.current.checked = false;
    }
  };

  const modalId = `delete-modal-${item.id}`;

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm mb-4">
      <div className="flex items-center flex-1">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">
            {item.name}
          </h3>
          <p className="text-sm text-gray-600">{getDescription()}</p>

          {/* Display additional client info if it's a client entity */}
          {type === 'entity' && item.type === 'CLIENT' && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 space-y-1">
                {item.gender && (
                  <span className="mr-2">Gender: {item.gender}</span>
                )}
                {item.height_cm && (
                  <span className="mr-2">Height: {item.height_cm}cm</span>
                )}
                {item.weight_kg && (
                  <span className="mr-2">Weight: {item.weight_kg}kg</span>
                )}
              </div>

              {(item.bench_1rm ||
                item.deadlift_1rm ||
                item.squat_1rm ||
                item.mile_time) && (
                <div className="text-xs text-gray-500 mt-1">
                  {item.bench_1rm && (
                    <span className="mr-2">Bench: {item.bench_1rm}kg</span>
                  )}
                  {item.deadlift_1rm && (
                    <span className="mr-2">
                      Deadlift: {item.deadlift_1rm}kg
                    </span>
                  )}
                  {item.squat_1rm && (
                    <span className="mr-2">Squat: {item.squat_1rm}kg</span>
                  )}
                  {item.mile_time && <span>Mile: {item.mile_time}s</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={getNavigationPath()}
          className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors"
        >
          {type === 'entity' ? 'View' : 'View and Edit'}
        </Link>

        {/* DaisyUI Modal Trigger */}
        <label
          htmlFor={modalId}
          className="p-2 bg-red-100 rounded-full hover:bg-red-200 transition-colors cursor-pointer"
        >
          <XMarkIcon className="h-5 w-5 text-red-500" />
        </label>

        {/* DaisyUI Modal */}
        <input
          type="checkbox"
          id={modalId}
          className="modal-toggle"
          ref={modalRef}
        />
        <div className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete {item.name}?</h3>
            <p className="py-4">{getDeleteMessage()}</p>
            <div className="modal-action">
              <label htmlFor={modalId} className="btn">
                Cancel
              </label>
              <button
                onClick={handleDelete}
                className="btn btn-error text-white"
              >
                Delete
              </button>
            </div>
          </div>
          <label className="modal-backdrop" htmlFor={modalId}></label>
        </div>
      </div>
    </div>
  );
}
