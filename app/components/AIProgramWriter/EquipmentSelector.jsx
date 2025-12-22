'use client';

import { useProgram } from '@/contexts/ProgramContext';
import equipmentList from '@/utils/equipmentList';
import { useCallback } from 'react';

export default function EquipmentSelector({ isVisible, onToggleVisibility }) {
  const { selectedEquipment, updateEquipment, updateFormFields, formData } =
    useProgram();

  const isAllEquipmentSelected =
    selectedEquipment.length === equipmentList.length;

  const handleEquipmentToggle = useCallback(
    async (equipmentValue) => {
      const value = equipmentValue === '-1' ? -1 : parseInt(equipmentValue);

      let newEquipment;
      if (value === -1) {
        // Toggle all equipment
        newEquipment = isAllEquipmentSelected
          ? []
          : equipmentList.map((item) => item.value);
      } else {
        const isSelected = selectedEquipment.includes(value);
        newEquipment = isSelected
          ? selectedEquipment.filter((item) => item !== value)
          : [...selectedEquipment, value];
      }

      // Update UI state with numeric IDs
      updateEquipment(newEquipment);

      // Convert equipment IDs to labels for database storage
      // This matches the format used by ProgramDetails.handleGymTypeSelect
      const equipmentLabels = newEquipment
        .map((id) => {
          const equipment = equipmentList.find((item) => item.value === id);
          return equipment ? equipment.label : null;
        })
        .filter(Boolean);

      // Update in database - preserve existing gym_details
      await updateFormFields({
        gym_details: {
          ...formData.gymDetails,
          equipment: equipmentLabels,
        },
      });
    },
    [
      selectedEquipment,
      isAllEquipmentSelected,
      updateEquipment,
      updateFormFields,
      formData,
    ]
  );

  return (
    <div>
      <button
        type="button"
        className="flex w-full justify-between items-center py-2 font-medium"
        onClick={onToggleVisibility}
      >
        <span>
          Equipment Selection
          {!isVisible && selectedEquipment.length > 0 && (
            <span className="text-sm text-base-content/70 ml-2">
              ({selectedEquipment.length} items selected)
            </span>
          )}
        </span>
        <span>{isVisible ? '−' : '+'}</span>
      </button>

      {isVisible && (
        <div className="mt-2 border p-3 rounded-md">
          <div className="mb-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                value="-1"
                checked={isAllEquipmentSelected}
                onChange={(e) => handleEquipmentToggle(e.target.value)}
              />
              <span className="font-medium">Select All Equipment</span>
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {equipmentList.map((item) => (
              <label key={item.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  value={item.value}
                  checked={selectedEquipment.includes(item.value)}
                  onChange={(e) => handleEquipmentToggle(e.target.value)}
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
