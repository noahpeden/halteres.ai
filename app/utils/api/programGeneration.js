// Shared utility functions for program generation API routes

/**
 * Log message with timestamp for consistent logging across routes
 * @param {string} message - The log message
 * @param {object|null} data - Optional data to log
 */
export function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

/**
 * Extract and normalize request parameters
 * @param {object} requestData - The raw request data
 * @returns {object} Normalized parameters
 */
export function extractParameters(requestData) {
  // Extract parameters with defaults
  const programId = requestData.programId;
  const goal = requestData.goal || 'General fitness';
  const difficulty = requestData.difficulty || 'Intermediate';
  const focusArea = requestData.focus_area || '';
  const additionalNotes = requestData.description || '';
  const personalization = requestData.personalization || '';
  const workoutFormats = requestData.workout_format || [];

  // Critical parameters - ensure they have fallback values
  const numberOfWeeks = parseInt(
    requestData.duration_weeks || requestData.numberOfWeeks || 4
  );
  const daysPerWeek = parseInt(
    requestData.days_per_week || requestData.daysPerWeek || 3
  );
  const programType =
    requestData.periodization?.program_type ||
    requestData.programType ||
    'linear';

  // Optional parameters
  const equipment =
    requestData.gym_details?.equipment || requestData.equipment || [];
  const gymType =
    requestData.gym_details?.gym_type || requestData.gymType || '';
  const startDate =
    requestData.calendar_data?.start_date || requestData.startDate || '';

  // Calculate total number of workouts
  const totalWorkouts = numberOfWeeks * daysPerWeek;

  // Get selected days of the week from request data
  const selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];

  return {
    programId,
    goal,
    difficulty,
    focusArea,
    additionalNotes,
    personalization,
    workoutFormats,
    numberOfWeeks,
    daysPerWeek,
    programType,
    equipment,
    gymType,
    startDate,
    totalWorkouts,
    selectedDaysOfWeek,
  };
}

/**
 * Generate suggested dates based on parameters
 * @param {number[]} selectedDaysOfWeek - Array of selected days (0=Sunday, 1=Monday, etc.)
 * @param {number} totalWorkouts - Total number of workouts to schedule
 * @param {string} startDate - Start date string (YYYY-MM-DD)
 * @returns {string[]} Array of suggested date strings
 */
export function generateSuggestedDates(
  selectedDaysOfWeek,
  totalWorkouts,
  startDate
) {
  const suggestedDates = [];
  const today = new Date();
  const startingDate = startDate ? new Date(startDate) : today;

  // If we have selected days, use them to generate dates
  if (selectedDaysOfWeek.length > 0) {
    let currentDate = new Date(startingDate);
    let workoutsAdded = 0;

    // Keep going until we have enough workouts
    while (workoutsAdded < totalWorkouts) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      if (selectedDaysOfWeek.includes(dayOfWeek)) {
        suggestedDates.push(currentDate.toISOString().split('T')[0]);
        workoutsAdded++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else {
    // Fallback: simple sequential dates if no days are selected
    for (let i = 0; i < totalWorkouts; i++) {
      const workoutDate = new Date(startingDate);
      workoutDate.setDate(startingDate.getDate() + i);
      suggestedDates.push(workoutDate.toISOString().split('T')[0]);
    }
  }

  return suggestedDates;
}

/**
 * Format client metrics into a string for prompt inclusion
 * @param {object} entityData - Client metrics data
 * @returns {string} Formatted client metrics content
 */
export function formatClientMetrics(entityData) {
  if (!entityData) return '';

  return `
Client Metrics:
${entityData.gender ? `Gender: ${entityData.gender}` : ''}
${entityData.height_cm ? `Height: ${entityData.height_cm} cm` : ''}
${entityData.weight_kg ? `Weight: ${entityData.weight_kg} kg` : ''}
${entityData.bench_1rm ? `Bench Press 1RM: ${entityData.bench_1rm} kg` : ''}
${entityData.squat_1rm ? `Squat 1RM: ${entityData.squat_1rm} kg` : ''}
${entityData.deadlift_1rm ? `Deadlift 1RM: ${entityData.deadlift_1rm} kg` : ''}
${entityData.mile_time ? `Mile Time: ${entityData.mile_time}` : ''}
${
  entityData.recovery_score
    ? `Recovery Score: ${entityData.recovery_score}/10`
    : ''
}
${
  entityData.injury_history
    ? `Injury History: ${
        typeof entityData.injury_history === 'object'
          ? JSON.stringify(entityData.injury_history)
          : entityData.injury_history
      }`
    : ''
}

When calculating RX weights, scale them appropriately based on the client's strength metrics (bench, squat, deadlift) if available.
For other movements, estimate appropriate weights based on the client's metrics, gender, and strength levels.
If client metrics indicate specific limitations, provide appropriate scaling options.`;
}

/**
 * Format reference workouts into a string for prompt inclusion
 * @param {Array} referenceWorkouts - Array of reference workout objects
 * @returns {string} Formatted reference workouts content
 */
export function formatReferenceWorkouts(referenceWorkouts) {
  if (!referenceWorkouts || referenceWorkouts.length === 0) return '';

  return `
Reference Workouts for Inspiration:
${referenceWorkouts
  .map(
    (workout, index) =>
      `Reference ${index + 1}: ${workout.title}
${workout.body}
---`
  )
  .join('\n')}

Draw inspiration from these reference workouts when designing this program. Use similar structures, movement patterns, and approaches where appropriate.`;
}

/**
 * Check if entity data has meaningful injury history
 * @param {object} entityData - Client metrics data
 * @returns {boolean} Whether injury history exists and is meaningful
 */
export function hasInjuryHistory(entityData) {
  if (!entityData || !entityData.injury_history) return false;

  if (
    typeof entityData.injury_history === 'string' &&
    entityData.injury_history.trim() !== ''
  ) {
    return true;
  }

  if (
    typeof entityData.injury_history === 'object' &&
    Object.keys(entityData.injury_history).length > 0 &&
    JSON.stringify(entityData.injury_history) !== '{}'
  ) {
    return true;
  }

  return false;
}

/**
 * Build the prompt for OpenAI, Anthropic, and Deepseek models
 * @param {object} params - Parameters for prompt construction
 * @returns {string} The constructed prompt
 */
export function buildPrompt({
  numberOfWeeks,
  daysPerWeek,
  totalWorkouts,
  selectedDayNames,
  goal,
  difficulty,
  focusArea,
  equipment,
  workoutFormats,
  gymType,
  additionalNotes,
  personalization,
  clientMetricsContent,
  referenceWorkoutsContent,
  suggestedDates,
  hasInjuryHistoryValue,
  programType,
}) {
  // Conditionally build scaling options sections
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  let scalingInstructions = '';
  let scalingBodyStructure = '';
  let coachingCueNumber = 7; // Default if scaling is included
  let cooldownNumber = 8; // Default if scaling is included

  if (includeScaling) {
    scalingInstructions = `
6. Scaling Options:
   - Intermediate level scaling with specific weights and movement modifications
   - Beginner level scaling with specific weights and movement modifications
   ${
     hasInjuryHistoryValue
       ? '- Injury considerations with alternative movements'
       : ''
   }`;

    scalingBodyStructure = `
## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific weights and modifications]

### Beginner Option
[Detailed beginner scaling with specific weights and modifications]
${
  hasInjuryHistoryValue
    ? `
### Injury Considerations
[Modifications for common limitations]`
    : ''
}`;
  } else {
    // Adjust numbering if scaling is omitted
    coachingCueNumber = 6;
    cooldownNumber = 7;
  }

  // Build the final prompt
  return `Generate a ${numberOfWeeks}-week training program with the following parameters:

${
  additionalNotes
    ? `IMPORTANT REQUIREMENTS FROM THE CLIENT: ${additionalNotes}
Please prioritize these specific requirements above all else in program design.

`
    : ''
}Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Selected Training Days: ${selectedDayNames}
Total Length: ${numberOfWeeks} weeks
${focusArea ? `Focus Area: ${focusArea}` : ''}
${
  equipment && equipment.length > 0
    ? `Available Equipment: ${equipment.join(', ')}`
    : ''
}
${
  workoutFormats && workoutFormats.length > 0
    ? `Workout Formats to Include: ${workoutFormats.join(', ')}`
    : ''
}
${gymType ? `Gym Type: ${gymType}` : ''}
${personalization ? `Personalization: ${personalization}` : ''}
${clientMetricsContent ? `${clientMetricsContent}` : ''}
${referenceWorkoutsContent ? `${referenceWorkoutsContent}` : ''}

For the program description, include:
1. A concise overview of the program's goals and intended adaptations
2. The periodization approach used and why it's appropriate
3. Expected outcomes from following the program
4. Recommendations for nutrition, recovery, and supplementary training

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper periodization, recovery, and exercise variation throughout the program.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "Training Program for ${goal}",
  "description": "A comprehensive ${numberOfWeeks}-week ${difficulty} training program focused on ${
    focusArea || goal
  } that includes detailed weekly progression, nutrition guidance, and recovery recommendations",
  "overview": "A detailed explanation of the program methodology, periodization approach, expected outcomes, and supplementary recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Focus Area] and [Creative Title]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Stimulus and Strategy
[Detailed explanation of workout stimulus and strategy approach]
- Explain the intended stimulus for both strength and conditioning portions
- Provide pacing guidance for each section
- Explain how to approach the workout (e.g., "Break the handstand push-ups into sets of 3 early")${scalingBodyStructure}

## Warm-up
[Detailed warm-up protocol with specific movements, sets, reps]
- Include duration, reps, and brief explanations
- Focus on movement preparation and activation

## Strength Work
[Complete strength workout with movements, sets, reps, specific weights]
- Clear exercise format (Sets x Reps, EMOM, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Loading percentages when appropriate (e.g., "75% of 1RM")

## Conditioning Work
[Complete conditioning workout with movements, sets, reps, specific weights]
- Clear exercise format (AMRAP, For Time, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Target time domains or goal times when applicable

## Cool-down
[Detailed cool-down protocol]
- Include specific movements and durations
- Focus on recovery and mobility work

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for the most complex movements
- Form tips to maximize efficiency and safety
- Common errors to avoid
\`\`\`

The "workouts" array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence.

Use the following dates for each workout:
${suggestedDates
  .map(
    (date, index) =>
      'Workout ' +
      (index + 1) +
      ': ' +
      date +
      ' (Week ' +
      (Math.floor(index / parseInt(daysPerWeek)) + 1) +
      ', Day ' +
      ((index % parseInt(daysPerWeek)) + 1) +
      ')'
  )
  .join('\n')}\

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`;
}

/**
 * Get the system prompt for the model
 * @returns {string} The system prompt
 */
export function getSystemPrompt() {
  return "You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create professional, functional fitness-style workouts with precise stimulus explanations, detailed scaling options, and specific coaching cues. Each workout should include clear RX weights, proper warm-up and cool-down protocols, and actionable strategy recommendations. Follow sound exercise science principles with appropriate progression, variation, and specificity. VERY IMPORTANT: Always prioritize the client's specific requirements from their description field above all other considerations - these are their must-have elements and should be incorporated throughout the program. Provide responses EXACTLY in the JSON format specified in the prompt.";
}

/**
 * Process the API response and normalize it to a consistent format
 * @param {object} responseContent - The raw response content from the model
 * @returns {object} Normalized response format
 */
export function normalizeResponse(responseContent) {
  // First try to parse the response if it's a string
  let parsedContent;
  if (typeof responseContent === 'string') {
    try {
      parsedContent = JSON.parse(responseContent);
    } catch (parseError) {
      throw new Error(
        `Failed to parse response as JSON: ${parseError.message}`
      );
    }
  } else {
    // Already an object
    parsedContent = responseContent;
  }

  // Normalize response format to workouts array
  let workouts;
  let programTitle = '';
  let programDescription = '';
  let programOverview = '';

  if (parsedContent.workouts && Array.isArray(parsedContent.workouts)) {
    workouts = parsedContent.workouts;
    programTitle = parsedContent.title || '';
    programDescription = parsedContent.description || '';
    programOverview = parsedContent.overview || '';
  } else if (Array.isArray(parsedContent)) {
    // Legacy format - just an array
    workouts = parsedContent;
  } else if (
    parsedContent.training_program &&
    Array.isArray(parsedContent.training_program)
  ) {
    workouts = parsedContent.training_program;
  } else {
    // Look for any array property as a fallback
    const arrayProps = Object.keys(parsedContent).filter((key) =>
      Array.isArray(parsedContent[key])
    );

    if (arrayProps.length > 0) {
      workouts = parsedContent[arrayProps[0]];
    } else if (parsedContent.title && parsedContent.description) {
      // If we got a single workout instead of an array
      workouts = [parsedContent];
    } else {
      throw new Error('Invalid response format: could not find workouts array');
    }
  }

  // Ensure each workout has the correct fields (title, body, date)
  workouts = workouts.map((workout, index) => {
    return {
      title: workout.title || `Workout ${index + 1}`,
      body: workout.body || workout.description || 'No description provided',
      date: workout.date || workout.suggestedDate || '',
    };
  });

  return {
    message: 'Program generated successfully',
    title: programTitle,
    description: programDescription,
    overview: programOverview || 'No overview provided',
    suggestions: workouts,
  };
}
