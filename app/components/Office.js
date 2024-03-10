'use client';

import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import { useRouter } from 'next/navigation';

export default function OfficeDrawer() {
  const { addOfficeInfo } = useOfficeContext();
  const { push } = useRouter();
  const [equipmentList, setEquipmentList] = useState([
    { name: 'rower', quantity: '12' },
    { name: 'barbell', quantity: '20' },
    { name: 'dumbbell', quantity: '30' },
  ]);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentQuantity, setNewEquipmentQuantity] = useState('');
  const [coachList, setCoachList] = useState([
    { name: 'Tyler', experience: 'CrossFit Level 1' },
  ]);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachExperience, setNewCoachExperience] = useState('');
  const [classSchedule, setClassSchedule] = useState('');
  const [classDuration, setClassDuration] = useState('');

  const handleAddEquipment = () => {
    setEquipmentList([
      ...equipmentList,
      { name: newEquipmentName, quantity: newEquipmentQuantity },
    ]);
    setNewEquipmentName('');
    setNewEquipmentQuantity('');
  };

  const updateEquipmentItem = (index, field, value) => {
    const newList = [...equipmentList];
    newList[index] = { ...newList[index], [field]: value };
    setEquipmentList(newList);
  };

  const handleAddCoach = () => {
    setCoachList([
      ...coachList,
      { name: newCoachName, experience: newCoachExperience },
    ]);
    setNewCoachName('');
    setNewCoachExperience('');
  };

  const updateCoachItem = (index, field, value) => {
    const newList = [...coachList];
    newList[index] = { ...newList[index], [field]: value };
    setCoachList(newList);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addOfficeInfo({ equipmentList, coachList, classSchedule, classDuration });
  };

  return (
    <div className={`drawer`}>
      <input id="officeDrawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        <label
          htmlFor="officeDrawer"
          className="btn btn-primary drawer-button lg:hidden"
        >
          Gym Info
        </label>
      </div>
      <div className="drawer-side">
        <label htmlFor="officeDrawer" className="drawer-overlay"></label>
        <ul className="menu p-4 overflow-y-auto w-80 pt-[100px] bg-base-100">
          <div className="space-y-4">
            <div className="space-y-4">
              <h2 className="text-xl">Gym Equipment</h2>
              <div className="space-y-2">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={newEquipmentName}
                  onChange={(e) => setNewEquipmentName(e.target.value)}
                  placeholder="Equipment name"
                />
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={newEquipmentQuantity}
                  onChange={(e) => setNewEquipmentQuantity(e.target.value)}
                  placeholder="Quantity"
                />
                <button
                  className="btn btn-primary w-full"
                  onClick={handleAddEquipment}
                >
                  Add Equipment
                </button>
              </div>

              {equipmentList.map((item, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={item.name}
                    onChange={(e) =>
                      updateEquipmentItem(index, 'name', e.target.value)
                    }
                  />
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={item.quantity}
                    onChange={(e) =>
                      updateEquipmentItem(index, 'quantity', e.target.value)
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl">Coaching Staff</h2>
              <div className="space-y-2">
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
                  className="btn btn-primary w-full"
                  onClick={handleAddCoach}
                >
                  Add Coach
                </button>
              </div>

              {coachList.map((coach, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={coach.name}
                    onChange={(e) =>
                      updateCoachItem(index, 'name', e.target.value)
                    }
                  />
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={coach.experience}
                    onChange={(e) =>
                      updateCoachItem(index, 'experience', e.target.value)
                    }
                  />
                </div>
              ))}
            </div>

            <h2 className="text-xl">Class Schedule</h2>
            <textarea
              className="textarea textarea-bordered w-full"
              value={classSchedule}
              onChange={(e) => setClassSchedule(e.target.value)}
            />

            <h2 className="text-xl">Class Duration</h2>
            <textarea
              className="textarea textarea-bordered w-full"
              value={classDuration}
              onChange={(e) => setClassDuration(e.target.value)}
            />

            <button
              className="btn btn-primary w-full mt-4"
              onClick={handleSubmit}
            >
              Save
            </button>
          </div>
        </ul>
      </div>
    </div>
  );
}
