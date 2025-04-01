'use client';

export default function EquipmentSelector({
  equipment,
  onEquipmentChange,
  equipmentList,
  allEquipmentSelected,
  isVisible,
  onToggleVisibility,
}) {
  return (
    <div>
      <button
        type="button"
        className="flex w-full justify-between items-center py-2 font-medium"
        onClick={onToggleVisibility}
      >
        <span>Equipment Selection</span>
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
                checked={allEquipmentSelected}
                onChange={onEquipmentChange}
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
                  checked={equipment.includes(item.value)}
                  onChange={onEquipmentChange}
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
