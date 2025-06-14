'use client';

import useProgramStore from '../../store/programStore';

export default function EquipmentSelector({
  isVisible,
  onToggleVisibility,
}) {
  const selectedEquipment = useProgramStore((state) => state.selectedEquipment);
  const equipmentList = useProgramStore((state) => state.equipmentList);
  const isAllEquipmentSelected = useProgramStore((state) => state.isAllEquipmentSelected);
  const handleEquipmentToggle = useProgramStore((state) => state.handleEquipmentToggle);
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
