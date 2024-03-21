'use client';

import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import EquipmentSelector from './EquipmentSelector';
import equipmentList from '@/utils/equipmentlist';

export default function Office() {
  const { addOfficeInfo } = useOfficeContext();
  const [equipmentList, setEquipmentList] = useState([]);
  const [coachList, setCoachList] = useState([]);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachExperience, setNewCoachExperience] = useState('');
  const [classSchedule, setClassSchedule] = useState('');
  const [classDuration, setClassDuration] = useState('');

  const handleAddCoach = () => {
    if (newCoachName && newCoachExperience) {
      setCoachList([
        ...coachList,
        { name: newCoachName, experience: newCoachExperience },
      ]);
      setNewCoachName('');
      setNewCoachExperience('');
    }
  };

  const removeCoach = (index) => {
    setCoachList(coachList.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addOfficeInfo({ equipmentList, coachList, classSchedule, classDuration });
  };
  const handleAddEquipmentDetail = (tag) => {
    setEquipmentList([...equipmentList, tag]);
  };
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gym Info</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <h2 className="text-xl mb-4">Equipment List</h2>
          <div className="space-y-2 mb-4">
            <EquipmentSelector
              selected={equipmentList.map((equipment, index) => ({
                id: index,
                name: equipment,
              }))}
              setSelected={(tags) =>
                setEquipmentList(tags.map((tag) => tag.name))
              }
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl mb-4">Coaching Staff</h2>
          <div className="space-y-2 mb-4">
            <input
              type="text"
              className="input input-bordered w-full"
              value={newCoachName}
              onChange={(e) => setNewCoachName(e.target.value)}
              placeholder="Coach name"
            />
            <input
              type="text"
              className="input input-bordered w-full"
              value={newCoachExperience}
              onChange={(e) => setNewCoachExperience(e.target.value)}
              placeholder="Experience"
            />
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={handleAddCoach}
            >
              Add Coach
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {coachList.map((coach, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  value={coach.name}
                  readOnly
                />
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  value={coach.experience}
                  readOnly
                />
                <button
                  type="button"
                  className="btn btn-error btn-sm"
                  onClick={() => removeCoach(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xl mb-4">Class Schedule</h2>
          <textarea
            className="textarea textarea-bordered w-full"
            value={classSchedule}
            onChange={(e) => setClassSchedule(e.target.value)}
            placeholder="Enter the class schedule"
          />
        </section>

        <section>
          <h2 className="text-xl mb-4">Class Duration</h2>
          <input
            type="text"
            className="input input-bordered w-full"
            value={classDuration}
            onChange={(e) => setClassDuration(e.target.value)}
            placeholder="Enter the duration for each class"
          />
        </section>

        <button className="btn btn-primary w-full" type="submit">
          Save Gym Info
        </button>
      </form>
    </div>
  );
}
