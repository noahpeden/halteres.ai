'use client';
import { useState } from 'react';
import { useOfficeContext } from '../../contexts/OfficeContext';

export default function NewGym() {
  const { addOfficeInfo } = useOfficeContext();
  const [equipmentList, setEquipmentList] = useState([]);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentQuantity, setNewEquipmentQuantity] = useState('');
  const [equipmentSize, setEquipmentSize] = useState('');
  const [coachList, setCoachList] = useState([]);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachExperience, setNewCoachExperience] = useState('');
  const [classSchedule, setClassSchedule] = useState('');
  const [classDuration, setClassDuration] = useState('');

  const equipmentQuantities = {
    small: 4,
    medium: 8,
    large: 12,
    xlarge: 20,
  };

  const defaultEquipments = [
    'assault bike',
    'power racks',
    'weight plates',
    'rowers',
    'treadmills',
    'bands',
    'kettlebells',
    'dumbbells',
    'barbells',
    'pull up bars',
    'med balls',
  ];

  const handleSizeChange = (size) => {
    setEquipmentSize(size);
    const quantity = equipmentQuantities[size];
    const newEquipmentList = defaultEquipments.map((equipment) => ({
      name: equipment,
      quantity: quantity,
    }));
    setEquipmentList(newEquipmentList);
  };

  const handleAddEquipment = () => {
    setEquipmentList([
      ...equipmentList,
      { name: newEquipmentName, quantity: newEquipmentQuantity },
    ]);
    setNewEquipmentName('');
    setNewEquipmentQuantity('');
  };

  const handleDeleteEquipment = (index) => {
    const newList = equipmentList.filter((_, idx) => idx !== index);
    setEquipmentList(newList);
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
    document
      .getElementById('whiteboard')
      .scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-3">Gym Details</h1>
      <h3 className="text-xl mb-6">
        These details will help the generation tailor the programming to your
        specific gym's needs.
      </h3>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl">Equipment</h2>
          <div className="mb-4">
            <label htmlFor="size-select" className="text-lg">
              Select Equipment Size:
            </label>
            <select
              id="size-select"
              className="select select-bordered ml-2"
              value={equipmentSize}
              onChange={(e) => handleSizeChange(e.target.value)}
            >
              <option value="">--Choose a size--</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="xlarge">X-Large</option>
            </select>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              className="input input-bordered flex-1"
              value={newEquipmentName}
              onChange={(e) => setNewEquipmentName(e.target.value)}
              placeholder="Equipment name"
            />
            <input
              type="number"
              className="input input-bordered w-20"
              value={newEquipmentQuantity}
              onChange={(e) => setNewEquipmentQuantity(e.target.value)}
              placeholder="Qty"
            />
            <button className="btn btn-primary" onClick={handleAddEquipment}>
              Add
            </button>
          </div>
          <ul>
            {equipmentList.map((item, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  value={item.name}
                  onChange={(e) =>
                    updateEquipmentItem(index, 'name', e.target.value)
                  }
                />
                <input
                  type="number"
                  className="input input-bordered w-20"
                  value={item.quantity}
                  onChange={(e) =>
                    updateEquipmentItem(index, 'quantity', e.target.value)
                  }
                />
                <button
                  className="btn btn-error"
                  onClick={() => handleDeleteEquipment(index)}
                >
                  Delete
                </button>
              </div>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl">Coaching Staff</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              className="input input-bordered flex-1"
              value={newCoachName}
              onChange={(e) => setNewCoachName(e.target.value)}
              placeholder="Coach name"
            />
            <input
              type="text"
              className="input input-bordered"
              value={newCoachExperience}
              onChange={(e) => setNewCoachExperience(e.target.value)}
              placeholder="Experience"
            />
            <button className="btn btn-primary" onClick={handleAddCoach}>
              Add
            </button>
          </div>
          {coachList.map((coach, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                value={coach.name}
                onChange={(e) => updateCoachItem(index, 'name', e.target.value)}
              />
              <input
                type="text"
                className="input input-bordered"
                value={coach.experience}
                onChange={(e) =>
                  updateCoachItem(index, 'experience', e.target.value)
                }
              />
            </div>
          ))}
        </div>
        <div className="space-y-4 col-span-1">
          <h2 className="text-xl">Class Schedule</h2>
          <textarea
            className="textarea textarea-bordered w-full h-32"
            value={classSchedule}
            onChange={(e) => setClassSchedule(e.target.value)}
          />
        </div>
        <div className="space-y-4 col-span-1">
          <h2 className="text-xl">Class Duration</h2>
          <textarea
            className="textarea textarea-bordered w-full h-32"
            value={classDuration}
            onChange={(e) => setClassDuration(e.target.value)}
          />
        </div>{' '}
      </div>

      <button className="btn btn-primary mt-6" onClick={handleSubmit}>
        Next
      </button>
    </div>
  );
}
