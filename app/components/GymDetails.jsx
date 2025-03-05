'use client';

import React, { useState } from 'react';

export default function GymDetails({ details, onUpdate }) {
  const [gymType, setGymType] = useState(details?.type || 'commercial');
  const [equipment, setEquipment] = useState(
    Array.isArray(details?.equipment) ? details.equipment : []
  );
  const [customEquipment, setCustomEquipment] = useState('');

  const gymTypes = [
    { id: 'commercial', label: 'Commercial Gym' },
    { id: 'home', label: 'Home Gym' },
    { id: 'outdoor', label: 'Outdoor/Park' },
    { id: 'crossfit', label: 'CrossFit Box' },
    { id: 'minimal', label: 'Minimal Equipment' },
  ];

  const commonEquipment = [
    'Barbell',
    'Dumbbells',
    'Kettlebells',
    'Resistance Bands',
    'Pull-up Bar',
    'Bench Press',
    'Squat Rack',
    'Leg Press',
    'Cable Machine',
    'Smith Machine',
    'Treadmill',
    'Exercise Bike',
    'Rowing Machine',
    'Elliptical',
    'Medicine Ball',
    'Foam Roller',
  ];

  const handleEquipmentToggle = (item) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter((e) => e !== item));
    } else {
      setEquipment([...equipment, item]);
    }
  };

  const handleAddCustomEquipment = () => {
    if (customEquipment.trim() && !equipment.includes(customEquipment.trim())) {
      setEquipment([...equipment, customEquipment.trim()]);
      setCustomEquipment('');
    }
  };

  const handleSave = () => {
    onUpdate({
      type: gymType,
      equipment: equipment,
    });
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Gym Details</h2>
        <p className="text-sm text-gray-500 mb-4">
          Specify your gym type and available equipment.
        </p>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Gym Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {gymTypes.map((type) => (
              <div key={type.id} className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="radio"
                    name="gym-type"
                    className="radio radio-primary"
                    checked={gymType === type.id}
                    onChange={() => setGymType(type.id)}
                  />
                  <span className="label-text">{type.label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-2">Available Equipment</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {commonEquipment.map((item) => (
              <div key={item} className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={equipment.includes(item)}
                    onChange={() => handleEquipmentToggle(item)}
                  />
                  <span className="label-text">{item}</span>
                </label>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="input input-bordered flex-1"
              value={customEquipment}
              onChange={(e) => setCustomEquipment(e.target.value)}
              placeholder="Add custom equipment..."
            />
            <button
              className="btn btn-outline"
              onClick={handleAddCustomEquipment}
              disabled={!customEquipment.trim()}
            >
              Add
            </button>
          </div>

          {equipment.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {equipment.map((item) => (
                <div key={item} className="badge badge-outline gap-1">
                  {item}
                  <button
                    className="btn btn-xs btn-ghost btn-circle"
                    onClick={() => handleEquipmentToggle(item)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-actions justify-end">
          <button className="btn btn-primary" onClick={handleSave}>
            Save Gym Details
          </button>
        </div>
      </div>
    </div>
  );
}
