// Unit conversion utilities shared across the application

// Weight conversions
export const kgToLbs = (kg) => (kg ? kg * 2.20462 : 0);
export const lbsToKg = (lbs) => (lbs ? lbs / 2.20462 : 0);

// Height conversions
export const cmToFeet = (cm) => {
  if (!cm || typeof cm === 'object') return { feet: 0, inches: 0 };
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

export const feetInchesToCm = (feet, inches) => {
  const ft = parseInt(feet) || 0;
  const inch = parseInt(inches) || 0;
  return Math.round((ft * 12 + inch) * 2.54);
};

// Format height for display
export const formatHeight = (cm, useImperial = true) => {
  if (!cm) return 'Not set';

  if (useImperial) {
    const { feet, inches } = cmToFeet(cm);
    return `${feet}'${inches}"`;
  }

  return `${cm} cm`;
};

// Format weight for display
export const formatWeight = (kg, useImperial = true) => {
  if (!kg) return 'Not set';

  if (useImperial) {
    return `${kgToLbs(kg).toFixed(1)} lbs`;
  }

  return `${kg} kg`;
};

// Format 1RM for display
export const format1RM = (kg, useImperial = true) => {
  if (!kg) return 'Not set';

  if (useImperial) {
    return `${kgToLbs(kg).toFixed(1)} lbs`;
  }

  return `${kg} kg`;
};
