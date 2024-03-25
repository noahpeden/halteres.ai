'use client';

import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import EquipmentSelector from './EquipmentSelector';
import Coaches from './Coaches';
import { XMarkIcon } from '@heroicons/react/16/solid';

export default function Office() {
  const { addOfficeInfo } = useOfficeContext();
  const [equipmentList, setEquipmentList] = useState([]);
  const [coachList, setCoachList] = useState([]);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachExperience, setNewCoachExperience] = useState('');
  const [classSchedule, setClassSchedule] = useState([]);
  const [classDuration, setClassDuration] = useState('');
  const [gymName, setGymName] = useState('');

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
    addOfficeInfo({
      equipmentList,
      coachList,
      classSchedule,
      classDuration,
      gymName,
    });
  };

  const removeEquipment = (index) => {
    setEquipmentList(equipmentList.filter((_, idx) => idx !== index));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Configure Your Gym</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <input
            type="text"
            value={gymName}
            className="input input-info input-bordered w-full "
            placeholder="Enter the gym name"
            onChange={(e) => setGymName(e.target.value)}
          />
        </section>
        <div className="divider divider-info"></div>

        <section className="flex justify-between">
          <EquipmentSelector
            selected={equipmentList}
            setSelected={setEquipmentList}
          />

          {equipmentList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {equipmentList.map((equipment, index) => (
                <div key={index} className="badge badge-info gap-2">
                  <div
                    onClick={() => removeEquipment(index)}
                    className="h-4 w-4 cursor-pointer transform hover:scale-110 "
                  >
                    <XMarkIcon
                      pointerEvents={'none'}
                      className="w-full h-full"
                    />
                  </div>
                  {equipment}
                </div>
              ))}
            </div>
          )}
        </section>
        <div className="divider divider-info"></div>
        <Coaches
          handleAddCoach={handleAddCoach}
          newCoachName={newCoachName}
          setNewCoachName={setNewCoachName}
          newCoachExperience={newCoachExperience}
          setNewCoachExperience={setNewCoachExperience}
          coachList={coachList}
          removeCoach={removeCoach}
        />
        <div className="divider divider-info"></div>
        <section>
          <h2 className="text-xl mb-4">Class Schedule</h2>
          <div className="flex flex-wrap gap-2">
            {[
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ].map((day, index) => (
              <label key={index} className="cursor-pointer label">
                <span className="label-text mr-2">{day}</span>
                <input
                  type="checkbox"
                  className="toggle toggle-accent"
                  checked={classSchedule.includes(day)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setClassSchedule([...classSchedule, day]);
                    } else {
                      setClassSchedule(classSchedule.filter((d) => d !== day));
                    }
                  }}
                />
              </label>
            ))}
          </div>
        </section>
        <div className="divider divider-info"></div>
        <section>
          <h2 className="text-xl mb-4">Class Duration</h2>
          <input
            type="text"
            className="input input-bordered w-full"
            value={classDuration}
            onChange={(e) => setClassDuration(e.target.value)}
            placeholder="e.g. 1 hour, 45 minutes, etc."
          />
        </section>

        <button className="btn btn-primary w-full text-white" type="submit">
          Save
        </button>
      </form>
    </div>
  );
}
