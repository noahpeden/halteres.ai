import React, { useCallback, useState, useRef } from 'react';
import equipmentList from '@/utils/equipmentList';

function EquipmentSelector({ selected, setSelected }) {
  return (
    <div className="flex flex-wrap w-full">
      {equipmentList.map((equipment) => {
        const isActive = selected.includes(equipment.label);
        console.log(isActive, 'active');
        return (
          <div className="flex w-1/5 m-2">
            <div
              key={equipment.label}
              className={`card bordered shadow-lg cursor-pointer ${
                isActive ? 'bg-light-blue' : ''
              } hover:shadow-xl transition-all duration-300 ease-in-out w-full`}
            >
              <div
                className="card-body"
                onClick={() => setSelected(equipment.label)}
              >
                {equipment.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default EquipmentSelector;
