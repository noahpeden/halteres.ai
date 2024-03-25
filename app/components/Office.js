'use client';

import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import EquipmentSelector from './EquipmentSelector';
import Coaches from './Coaches';

export default function Office() {
  const { addOfficeInfo } = useOfficeContext();
  const [equipmentList, setEquipmentList] = useState([]);
  const [coachList, setCoachList] = useState([]);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachExperience, setNewCoachExperience] = useState('');
  const [classSchedule, setClassSchedule] = useState('');
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Create a New Gym</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Enter the gym name"
            onChange={(e) => setGymName(e.target.value)}
          />
        </section>
        <section>
          <h2 className="text-xl mb-4">Gym Equipment</h2>
          <EquipmentSelector
            selected={equipmentList}
            setSelected={setEquipmentList}
          />
        </section>
        <Coaches
          handleAddCoach={handleAddCoach}
          newCoachName={newCoachName}
          setNewCoachName={setNewCoachName}
          newCoachExperience={newCoachExperience}
          setNewCoachExperience={setNewCoachExperience}
          coachList={coachList}
          removeCoach={removeCoach}
        />
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

        <button className="btn btn-primary w-full text-white" type="submit">
          Save Gym Info
        </button>
      </form>
    </div>
  );
}
