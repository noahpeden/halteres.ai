/**
 * Periodization utilities for prompt generation
 * Contains detailed definitions and implementation guidelines for different periodization models
 */

/**
 * Returns detailed guidelines for the specified periodization type
 * @param {string} programType - The periodization type (linear, undulating, block, etc.)
 * @returns {Object} Object containing definitions, implementation guidelines, and general guidance
 */
export function getPeriodizationGuidelines(programType = 'linear') {
  const type = (programType || 'linear').toLowerCase();

  // Base implementation instructions that apply to all periodization models
  const baseImplementation = `
- This periodization model must be strictly followed throughout the entire program
- Each workout should explicitly state which phase/cycle/block it belongs to
- Include specific intensity and volume prescriptions aligned with this model
- Ensure logical progression according to the model's principles
- Include appropriate deload protocols when necessary`;

  // Detailed guidelines for each periodization type
  const periodizationModels = {
    linear: {
      name: 'Linear (Traditional) Periodization',
      definition: `A sequential model that divides a training cycle into distinct phases (or "mesocycles")—typically hypertrophy, strength, and power—each with progressively higher intensity (load) and lower volume (sets × reps).`,
      phases: [
        `Hypertrophy Phase: Moderate loads (60–75% 1RM), high volume (8–15 reps).`,
        `Strength Phase: Higher loads (80–90% 1RM), moderate volume (3–6 reps).`,
        `Power/Peaking Phase: Very high loads or explosive loads (30–60% 1RM for fast movements), low volume (1–3 reps).`,
      ],
      implementation: `
IMPORTANT: Implement this linear progression by:
- Dividing the ${
        programType === 'linear'
          ? 'program'
          : 'program (despite the selected ' + programType + ' type)'
      } into distinct phases
- Starting with a hypertrophy phase (first ~40% of program)
- Transitioning to a strength phase (middle ~40% of program)
- Finishing with a power/peaking phase (final ~20% of program)
- Progressively increasing intensity while decreasing volume across the phases
- Using specific intensity ranges for each phase: hypertrophy (60-75% 1RM), strength (80-90% 1RM), power (85-95% 1RM or 30-60% 1RM for explosive movements)
${baseImplementation}`,
    },

    'reverse linear': {
      name: 'Reverse Linear Periodization',
      definition: `Simply flips the traditional model: you start with high-intensity, low-volume work (strength or power) and gradually transition toward higher-volume, lower-intensity (hypertrophy/endurance) work.`,
      phases: [
        `Power/Strength Phase: High intensity (80-95% 1RM), low volume (1-5 reps).`,
        `Moderate Load Phase: Medium intensity (70-80% 1RM), medium volume (6-8 reps).`,
        `Volume/Hypertrophy Phase: Lower intensity (60-70% 1RM), high volume (8-15 reps).`,
      ],
      implementation: `
IMPORTANT: Implement this reverse linear progression by:
- Dividing the program into distinct reverse phases
- Starting with a strength/power phase (first ~30% of program)
- Transitioning to a moderate intensity phase (middle ~30% of program)
- Finishing with a high-volume, lower intensity phase (final ~40% of program)
- Progressively decreasing intensity while increasing volume across the phases
- Using specific intensity ranges for each phase in reverse order: strength (80-90% 1RM), moderate (70-80% 1RM), hypertrophy (60-70% 1RM)
${baseImplementation}`,
    },

    undulating: {
      name: 'Undulating Periodization',
      definition: `Rather than long, distinct phases, intensity and volume "undulate" frequently—either daily or weekly—allowing continual variation in stimulus.`,
      variations: [
        `Daily Undulating Periodization (DUP): Different focus each session (e.g., Monday = heavy strength, Wednesday = hypertrophy, Friday = power).`,
        `Weekly Undulating Periodization (WUP): Each week emphasizes a different focus (Week 1 = hypertrophy, Week 2 = strength, Week 3 = power, then repeat).`,
      ],
      implementation: `
IMPORTANT: Implement this undulating periodization by:
- Creating variation between workouts rather than long phases
- Rotating between hypertrophy, strength, and power/explosive work on a daily or weekly basis
- For Daily Undulating Periodization: assign a different focus to each workout within a week (e.g., Day 1: 3-5 reps at 85-90% 1RM, Day 2: 8-12 reps at 65-75% 1RM, Day 3: 1-3 reps at 90-95% 1RM or explosive work)
- For Weekly Undulating Periodization: assign a different focus to each week (e.g., Week 1: hypertrophy focus with 8-12 reps, Week 2: strength focus with 4-6 reps, Week 3: power focus with 1-3 reps, then repeat pattern)
- Clearly specify which type of session each workout represents
- Maintain the undulating pattern consistently throughout the program
${baseImplementation}`,
    },

    block: {
      name: 'Block Periodization',
      definition: `Divides the macrocycle into highly concentrated "blocks," each targeting one primary quality while still maintaining others at a lower level.`,
      blocks: [
        `Accumulation Block: Build work capacity and general fitness (higher volume, submaximal loads).`,
        `Transmutation Block: Convert capacity into sport-specific strength and power (moderate volume, higher loads).`,
        `Realization Block (Peaking): Peak performance with very high intensity, low volume, and tapering.`,
      ],
      implementation: `
IMPORTANT: Implement this block periodization by:
- Dividing the program into 3 distinct concentrated blocks
- Accumulation Block (first ~40% of program): Focus on volume, general fitness, and work capacity with moderate loads (65-75% 1RM)
- Transmutation Block (middle ~40% of program): Focus on converting general fitness to specific strength/power (75-85% 1RM)
- Realization Block (final ~20% of program): Focus on peaking with high intensity (85-95% 1RM), lower volume, and appropriate tapering
- Each block should have a highly concentrated focus on one specific quality
- Maintain other qualities at maintenance levels within each block
${baseImplementation}`,
    },

    conjugate: {
      name: 'Conjugate (Concurrent) Periodization',
      definition: `Originating from the Westside Barbell method, this model develops multiple qualities (max strength, dynamic effort, repetition effort) simultaneously each week.`,
      days: [
        `Max Effort Days: Very heavy singles or doubles to drive maximal strength.`,
        `Dynamic Effort Days: Submaximal loads moved explosively to build power.`,
        `Repetition Effort/Accessory Days: Higher-volume accessory work for hypertrophy and structural balance.`,
      ],
      implementation: `
IMPORTANT: Implement this conjugate periodization by:
- Developing multiple qualities simultaneously rather than in sequential phases
- Structuring each week to include all of the following:
  * Max Effort Day(s): Very heavy singles, doubles or triples (90-100% 1RM) focused on maximal strength
  * Dynamic Effort Day(s): Submaximal loads (50-70% 1RM) moved explosively with speed to develop power
  * Repetition Effort Day(s): Higher volume (8-15 reps) accessory work for hypertrophy and structural balance
- Rotating main lift variations every 1-3 weeks
- Including appropriate accessory work to address weaknesses
- Maintaining this structure throughout the entire program
${baseImplementation}`,
    },

    'step loading': {
      name: 'Step Loading (Wave Loading)',
      definition: `Within a mesocycle, load is incrementally increased for a few workouts (e.g., +2.5–5 kg each session for three sessions), then volume/intensity is reset downward before starting the next "wave."`,
      implementation: `
IMPORTANT: Implement this step/wave loading by:
- Creating microcycles of 3-4 workouts where load progressively increases
- After each microcycle, reset the load to a lower value before beginning the next wave
- Example pattern for a main lift: Week 1: 70%→75%→80%, Week 2: 75%→80%→85%, Week 3: 80%→85%→90%
- Each wave should start slightly higher than the previous wave's starting point
- Clearly indicate the wave pattern in each workout
- Maintain this loading pattern throughout the program
${baseImplementation}`,
    },

    tapering: {
      name: 'Tapering',
      definition: `Essentially a short peaking block, the taper reduces training volume (by ~40–70%) while maintaining or slightly reducing intensity over 1–3 weeks to allow full recovery and supercompensation before competition or testing.`,
      implementation: `
IMPORTANT: Implement this tapering approach by:
- Starting with normal training volume and intensity
- Gradually reducing training volume (by 40-70%) over the course of the program
- Maintaining or slightly reducing intensity during the taper
- Scheduling the final 1-3 weeks with progressively less volume to allow for recovery
- Including adequate rest days before any testing or performance days
- Focusing on technical proficiency and movement quality during the taper
${baseImplementation}`,
    },
  };

  // General recommendation if a specific periodization type isn't found
  const generalGuidelines = {
    name: 'Custom Periodization',
    definition: `A personalized approach to training progression that may combine elements of various periodization models.`,
    implementation: `
IMPORTANT: Implement a logical periodization structure by:
- Clearly defining the training phases or cycles
- Establishing appropriate progression in intensity and volume
- Planning for recovery with strategic deloads
- Setting realistic performance goals for each phase
- Adapting training variables to the athlete's needs
${baseImplementation}`,
  };

  // Return the appropriate guidelines or fall back to general guidelines
  return periodizationModels[type] || generalGuidelines;
}

/**
 * Formats detailed periodization guidelines into a string for prompts
 * @param {string} programType - The periodization type
 * @returns {string} Formatted string with details about the periodization model
 */
export function formatPeriodizationGuidelines(programType) {
  if (!programType || programType.trim() === '') {
    return '';
  }

  const guidelines = getPeriodizationGuidelines(programType);

  let formattedString = `
## Periodization Model: ${guidelines.name}
${guidelines.definition}

`;

  // Add phases/variations/blocks/days if they exist
  if (guidelines.phases) {
    formattedString += `### Phases:\n${guidelines.phases
      .map((phase) => `- ${phase}`)
      .join('\n')}\n\n`;
  } else if (guidelines.variations) {
    formattedString += `### Variations:\n${guidelines.variations
      .map((variation) => `- ${variation}`)
      .join('\n')}\n\n`;
  } else if (guidelines.blocks) {
    formattedString += `### Blocks:\n${guidelines.blocks
      .map((block) => `- ${block}`)
      .join('\n')}\n\n`;
  } else if (guidelines.days) {
    formattedString += `### Training Structure:\n${guidelines.days
      .map((day) => `- ${day}`)
      .join('\n')}\n\n`;
  }

  // Add implementation guidelines
  formattedString += `### Implementation Guidelines:${guidelines.implementation}\n`;

  return formattedString;
}
