'use client';

import { useState } from 'react';
import EquipmentSelector from './EquipmentSelector';
import Coaches from './Coaches';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { useAuth } from '../contexts/AuthContext';

export default function Office() {
  const { user } = useAuth();
  const [equipmentList, setEquipmentList] = useState([
    'Barbell',
    'Bumper Plates',
    'Power Rack',
    'Kettlebell',
    'Rower',
  ]);
  const [coachList, setCoachList] = useState([]);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachExperience, setNewCoachExperience] = useState('');
  const [classSchedule, setClassSchedule] = useState([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]);
  const [classDuration, setClassDuration] = useState('');
  const [gymName, setGymName] = useState('');
  const [openAir, setOpenAir] = useState(true);
  const [outdoorRunning, setOutdoorRunning] = useState(true);
  const [quirks, setQuirks] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/Office', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openAir,
          outdoorRunning,
          quirks,
          gymName,
          equipmentList,
          coachList,
          classSchedule,
          classDuration,
          userId: user?.data.user.id, // Assuming 'user' object has an 'id'. Adjust as necessary.
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Gym created:', result.data);
        // Handle success (e.g., show success message, redirect, etc.)
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating gym:', error);
      // Handle error (e.g., show error message)
    }
  };

  const removeEquipment = (index) => {
    setEquipmentList(equipmentList.filter((_, idx) => idx !== index));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Configure Your Gym</h1>
      <div className="space-y-6">
        <section>
          <input
            type="text"
            value={gymName}
            className="input input-info input-bordered w-full focus:outline-primary"
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
        <section className="w-[50%]">
          <label className="cursor-pointer label">
            <span className="label-text mr-2">Is the gym open air?</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={openAir}
              onChange={() => setOpenAir(!openAir)}
            />
          </label>
          <label className="cursor-pointer label">
            <span className="label-text mr-2">Is the running outdoors?</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={outdoorRunning}
              onChange={() => setOutdoorRunning(!outdoorRunning)}
            />
          </label>
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
                  className="toggle toggle-secondary"
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
            className="input input-bordered focus:outline-primary w-full"
            value={classDuration}
            onChange={(e) => setClassDuration(e.target.value)}
            placeholder="e.g. 1 hour, 45 minutes, etc."
          />
        </section>
        <div className="divider divider-info"></div>
        <section>
          <h2 className="text-xl mb-4">Quirks</h2>
          <textarea
            className="textarea textarea-bordered focus:outline-primary w-full"
            placeholder="Any quirks or special features of the gym?"
            value={quirks}
            onChange={(e) => setQuirks(e.target.value)}
          ></textarea>
        </section>
        <button
          className="btn btn-primary w-full text-white"
          onClick={handleSubmit}
          type="button"
        >
          Save and Continue
        </button>
      </div>
    </div>
  );
}
