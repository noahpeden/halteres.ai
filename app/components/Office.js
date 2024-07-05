'use client';

import { useState, useEffect } from 'react';
import EquipmentSelector from './EquipmentSelector';
import Coaches from './Coaches';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { useAuth } from '@/contexts/AuthContext';
import { useOfficeContext } from '@/contexts/OfficeContext';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

export default function Office({ setStep, params }) {
  const { user, supabase } = useAuth();
  const { addOfficeInfo, office } = useOfficeContext();

  const [equipmentList, setEquipmentList] = useState([]);
  const [coachList, setCoachList] = useState([]);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachExperience, setNewCoachExperience] = useState('');
  const [classSchedule, setClassSchedule] = useState([]);
  const [classDuration, setClassDuration] = useState('');
  const [gymName, setGymName] = useState('');
  const [openAir, setOpenAir] = useState(true);
  const [outdoorRunning, setOutdoorRunning] = useState(true);
  const [quirks, setQuirks] = useState('');

  useEffect(() => {
    async function fetchOfficeInfo() {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('program_id', params.programId)
        .single();

      if (error) {
        console.error('Error fetching data:', error);
      } else if (data) {
        const officeInfo = {
          ...data,
          programId: data.program_id,
          openAir: data.open_air,
          outdoorRunning: data.outside_running_path,
          equipment: JSON.parse(data.equipment || '[]'),
          coaches: JSON.parse(data.coaches || '[]'),
        };
        addOfficeInfo(officeInfo);
      }
    }
    fetchOfficeInfo();
  }, [params.programId, supabase, addOfficeInfo]);

  useEffect(() => {
    if (office) {
      setEquipmentList(office.equipment || []);
      setCoachList(office.coaches || []);
      setClassSchedule(office.schedule || []);
      setClassDuration(office.duration || '');
      setGymName(office.name || '');
      setOpenAir(office.openAir ?? true);
      setOutdoorRunning(office.outdoorRunning ?? true);
      setQuirks(office.quirks || '');
    }
  }, [office]);

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
    const officeDetails = {
      openAir,
      outdoorRunning,
      quirks,
      name: gymName,
      equipment: equipmentList,
      coaches: coachList,
      schedule: classSchedule,
      duration: classDuration,
      user_id: user?.data.user.id,
    };
    addOfficeInfo(officeDetails);

    try {
      const response = await fetch('/api/Office', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(officeDetails),
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
    setStep(2);
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

        <section className="flex flex-col sm:flex-row sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <EquipmentSelector
            selected={equipmentList}
            setSelected={setEquipmentList}
          />

          {equipmentList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {equipmentList.map((equipment, index) => (
                <div key={index} className="badge badge-info gap-2">
                  <XMarkIcon
                    className="h-4 w-4 cursor-pointer"
                    onClick={() => removeEquipment(index)}
                  />
                  {equipment}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
          <div className="flex items-center mb-4">
            <h2 className="text-xl">Quirks</h2>
            <div
              className="ml-2 tooltip tooltip-info cursor-pointer"
              data-tip="Any quirks or special features of the gym? I.e. funky equipment, things that only you would know that you would like taken into account in the program creation?"
            >
              <InformationCircleIcon className="h-6 w-6 text-gray-500" />
            </div>
          </div>

          <textarea
            className="textarea textarea-bordered focus:outline-primary w-full"
            placeholder="We only have 6 rowers, no ski ergs, and the pull-up bar is 8ft tall."
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
