export const formatDate = (dateString) => {
  if (!dateString) return 'Not scheduled';

  const options = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  // Parse the date parts to avoid timezone issues
  const [year, month, day] = dateString
    .split('-')
    .map((num) => parseInt(num, 10));

  // Create a date object with the exact date (months are 0-indexed in JS Date)
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, options);
};

export const processWorkoutDescription = (description) => {
  // Convert the plain text format into a markdown format
  const sections = description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let formattedDescription = '';
  let currentSection = '';

  sections.forEach((line) => {
    if (line.toLowerCase().includes('warm-up:')) {
      currentSection = 'warm-up';
      formattedDescription +=
        '\n## Warm-up\n\n' + line.split(':')[1].trim() + '\n';
    } else if (line.toLowerCase().includes('strength:')) {
      currentSection = 'strength';
      formattedDescription += '\n## Strength\n\n';
    } else if (line.toLowerCase().includes('conditioning:')) {
      currentSection = 'conditioning';
      formattedDescription += '\n## Conditioning\n\n';
    } else if (line.toLowerCase().includes('cool-down:')) {
      currentSection = 'cool-down';
      formattedDescription +=
        '\n## Cool-down\n\n' + line.split(':')[1].trim() + '\n';
    } else if (line.toLowerCase().includes('performance notes:')) {
      currentSection = 'notes';
      formattedDescription += '\n## Performance Notes\n\n';
    } else if (line.toLowerCase().includes('rx:')) {
      formattedDescription += '\n### RX\n' + line.split(':')[1].trim() + '\n';
    } else if (line.toLowerCase().includes('scaling:')) {
      formattedDescription +=
        '\n### Scaling Options\n' + line.split(':')[1].trim() + '\n';
    } else if (
      line.includes(':') &&
      line.split(':')[0].trim().toLowerCase() === 'minute'
    ) {
      // Handle EMOM format
      formattedDescription += line + '\n';
    } else if (line.startsWith('-')) {
      // Handle bullet points
      formattedDescription += line + '\n';
    } else {
      // Regular line in current section
      formattedDescription += line + '\n';
    }
  });

  return formattedDescription.trim();
};

export const dayNameToNumber = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export const dayNumberToName = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};
