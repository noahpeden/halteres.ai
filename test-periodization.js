// test-periodization.js
import promptBuilder from './app/utils/prompt-builder/promptBuilder.js';
import { formatPeriodizationGuidelines } from './app/utils/prompt-builder/periodizationUtils.js';

// Test different periodization types
const periodizationTypes = [
  'linear',
  'undulating',
  'block',
  'conjugate',
  'reverse linear',
  'step loading',
  'tapering',
];

// Test with powerlifting methodology
const testContext = {
  goal: 'Strength development',
  difficulty: 'Intermediate',
  focus_area: 'Lower body',
  description: 'Need to improve my squat and deadlift for competition',
  personalization: 'I have a meet in 12 weeks',
  days_per_week: 4,
  duration_weeks: 12,
};

console.log('==========================================');
console.log('PERIODIZATION GUIDELINES TEST');
console.log('==========================================');

// Test each periodization type
periodizationTypes.forEach((type) => {
  console.log(`\n[TESTING PERIODIZATION TYPE: ${type.toUpperCase()}]\n`);

  // Get the formatted guidelines for this type
  const guidelines = formatPeriodizationGuidelines(type);
  console.log(guidelines);

  console.log('\n------------------------------------------\n');
});

// Test a full prompt with one of the periodization types
const undulatingContext = {
  ...testContext,
  programType: 'undulating',
};

console.log('==========================================');
console.log('FULL PROMPT TEST WITH UNDULATING PERIODIZATION');
console.log('==========================================');

const undulatingPrompt = promptBuilder(undulatingContext, 'powerlifting');
console.log(
  undulatingPrompt.substring(0, 1000) + '...\n[truncated for brevity]'
);

console.log('Test completed!');
