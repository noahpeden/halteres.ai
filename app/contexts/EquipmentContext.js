'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { gymEquipmentPresets } from '../components/utils';
import equipmentList from '../utils/equipmentList';

// Mapping from snake_case to Title Case for gym types
const gymTypeMapping = {
  'crossfit_box': 'Crossfit Box',
  'commercial_gym': 'Commercial Gym',
  'home_gym': 'Home Gym',
  'minimal_equipment': 'Minimal Equipment',
  'outdoor_space': 'Outdoor Space',
  'powerlifting_gym': 'Powerlifting Gym',
  'olympic_weightlifting_gym': 'Olympic Weightlifting Gym',
  'bodyweight_only': 'Bodyweight Only',
  'studio_gym': 'Studio Gym',
  'university_gym': 'University Gym',
  'hotel_gym': 'Hotel Gym',
  'apartment_gym': 'Apartment Gym',
  'boxing_mma_gym': 'Boxing/MMA Gym',
  'triathlon_training_facility': 'Triathlon Training Facility',
  'multi_sport_complex': 'Multi-Sport Complex',
};

const EquipmentContext = createContext();

export function useEquipment() {
  const context = useContext(EquipmentContext);
  if (!context) {
    throw new Error('useEquipment must be used within an EquipmentProvider');
  }
  return context;
}

export function EquipmentProvider({ children }) {
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectedGymType, setSelectedGymType] = useState('crossfit_box');
  const onEquipmentChangeRef = useRef(null);

  // Update equipment when gym type changes
  useEffect(() => {
    if (selectedGymType) {
      // Handle both snake_case (from wizard) and Title Case (from AI writer) gym types
      const mappedGymType = gymTypeMapping[selectedGymType] || selectedGymType;
      const preset = gymEquipmentPresets[mappedGymType];
      
      console.log('EquipmentContext: Gym type changed, checking if should update equipment:', {
        originalGymType: selectedGymType,
        mappedGymType,
        preset: preset || 'No preset found',
        currentEquipment: selectedEquipment,
        equipmentLength: selectedEquipment.length
      });
      
      // Auto-set equipment preset for gym type changes
      if (preset && preset.length > 0) {
        console.log('EquipmentContext: Auto-setting equipment preset for gym type');
        setSelectedEquipment(preset);
      }
    }
  }, [selectedGymType]);

  const handleEquipmentToggle = (equipmentValue) => {
    const value = equipmentValue === '-1' ? -1 : parseInt(equipmentValue);

    if (value === -1) {
      // Toggle all equipment
      const allSelected = selectedEquipment.length === equipmentList.length;
      const newEquipment = allSelected ? [] : equipmentList.map((item) => item.value);
      setSelectedEquipment(newEquipment);
      
      // Trigger callback if provided
      if (onEquipmentChangeRef.current) {
        onEquipmentChangeRef.current(newEquipment);
      }
    } else {
      setSelectedEquipment((prev) => {
        const isSelected = prev.includes(value);
        const newEquipment = isSelected
          ? prev.filter((item) => item !== value)
          : [...prev, value];
          
        // Trigger callback if provided
        if (onEquipmentChangeRef.current) {
          onEquipmentChangeRef.current(newEquipment);
        }
        
        return newEquipment;
      });
    }
  };

  const updateGymType = (gymType) => {
    setSelectedGymType(gymType);
  };

  const updateEquipment = (equipment) => {
    setSelectedEquipment(equipment);
  };

  const setEquipmentChangeCallback = (callback) => {
    onEquipmentChangeRef.current = callback;
  };

  const isAllEquipmentSelected = selectedEquipment.length === equipmentList.length;

  const value = {
    selectedEquipment,
    selectedGymType,
    equipmentList,
    isAllEquipmentSelected,
    handleEquipmentToggle,
    updateGymType,
    updateEquipment,
    setSelectedEquipment,
    setSelectedGymType,
    setEquipmentChangeCallback,
  };

  return (
    <EquipmentContext.Provider value={value}>
      {children}
    </EquipmentContext.Provider>
  );
}