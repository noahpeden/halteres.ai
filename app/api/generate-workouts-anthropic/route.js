import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { programId, programDetails, clientMetrics, preferences, office, whiteboard } = body;
    const supabase = await createClient();

    // Fetch program details if not provided
    let entityId;
    let gymId;
    if (programDetails?.entity_id) {
      entityId = programDetails.entity_id;
      gymId = programDetails.gym_id || null;
    } else {
      // Fetch the program to get the entity_id and gym_id
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('entity_id, gym_id')
        .eq('id', programId)
        .single();

      if (programError) throw programError;
      entityId = program?.entity_id;
      gymId = program?.gym_id;
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Get matched workouts if available
    let matchedWorkouts = [];
    if (whiteboard?.focus) {
      // Note: Anthropic doesn't provide embeddings API, so we use Supabase's search directly
      // In a production app, you might want to use a separate embeddings provider
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .textSearch('content', whiteboard.focus, {
          type: 'websearch',
        })
        .limit(10);

      if (!error) {
        matchedWorkouts = data || [];
      }
    }

    // Create the user prompt
    const userPrompt = `
    Create a detailed workout program for a ${preferences.personalization || 'general athlete'} 
    for the next ${preferences.duration || '7'} days. The user has the following details:
    - Equipment: ${office?.equipmentList || 'Standard gym equipment'}
    - Coaching staff experience: ${
      office?.coachList?.length
        ? office?.coachList.map((coach) => coach.experience).join(', ')
        : 'Not specified'
    }
    - Class schedule: ${office?.classSchedule || 'Not specified'}
    - Class duration: ${office?.classDuration || '60 minutes'}
    - Workout formats: ${preferences.workoutFormats || 'Standard format'}
    - Workout cycle length: ${preferences.duration || '7 days'}
    - Workout focus: ${preferences.focusArea || 'General fitness'}
    - Goal: ${preferences.goal || 'Overall fitness'}
    - Difficulty level: ${preferences.difficulty || 'Intermediate'}
    - Quirks: ${preferences.quirks || 'None'}
    - Gym name: ${office?.gymName || 'Your Gym'}

    Please use the following as primary references for workout structure and style:
    1. Example workout: ${preferences.exampleWorkout || 'Not provided'}
    2. Uploaded workouts: ${
      matchedWorkouts.length
        ? matchedWorkouts.map((workout) => workout.content).join('\n\n')
        : 'No uploaded workout provided'
    }
    
    Additional notes from the user: ${preferences.additionalNotes || 'None'}
    `;

    // System prompt for workout generation - following Claude 4.5 best practices
    const systemPrompt = `You are an expert strength and conditioning coach specializing in creating detailed, personalized workout programs.

<program_parameters>
Duration: ${preferences.duration || '7'} days
Athlete Type: ${preferences.personalization || 'general athlete'}
Focus Area: ${preferences.focusArea || 'general fitness'}
Goal: ${preferences.goal || 'overall fitness'}
</program_parameters>

<output_requirements>
Generate exactly ${preferences.duration || '7'} unique workouts with this structure for each:

1. Title: Create a unique, engaging title
2. Body with three scaling levels:
   - RX: Main workout with specific weights/percentages/RPE for male and female
   - Scaled: Adjusted weights and movement modifications
   - RX+: More challenging version for advanced athletes
3. Coaching Strategy:
   - Time Frame breakdown (Intro, Warmup, Strength, Workout, Cooldown, Mobility)
   - Target Score with time caps
   - Stimulus and Goals explanation
4. Movement Strategy: Form cues, pacing advice, common faults, specific weights by gender
5. Cool-down with specific stretches and durations
</output_requirements>

<constraints>
Only use equipment from: ${office?.equipmentList || 'standard gym equipment'}
Context: Including exercises requiring unlisted equipment makes workouts impractical for users with limited equipment access.
</constraints>

<quality_guidance>
- Build progressive overload across the ${preferences.duration || '7'} days
- Vary movements and time domains to prevent monotony
- Include benchmark workouts where appropriate for progress tracking
- Use RPE scales alongside percentage-based loading
- Make each workout unique and specific, avoiding generic instructions
</quality_guidance>`;

    // Generate workouts using Anthropic
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    });

    const generatedContent = response.content[0].text;

    // Parse the generated content into workout objects
    const workouts = parseWorkoutsFromContent(generatedContent, preferences);

    // Store the generated workouts in the program_workouts table
    for (const workout of workouts) {
      await supabase.from('program_workouts').insert({
        program_id: programId,
        entity_id: entityId,
        gym_id: gymId,
        title: workout.title,
        body: workout.description || workout.content,
        workout_type: workout.type,
        difficulty: preferences.difficulty || 'intermediate',
        tags: {
          type: workout.type,
          focus: workout.focus || preferences.focusArea,
          generated: true,
          model: 'anthropic',
        },
        scheduled_date: workout.date || workout.scheduled_date,
        notes: 'AI-generated workout (Anthropic)',
      });
    }

    return NextResponse.json({ workouts, rawContent: generatedContent }, { status: 200 });
  } catch (error) {
    console.error('Error generating workouts with Anthropic:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to match workouts (text search based)
async function matchWorkouts(supabase, searchTerm) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .textSearch('content', searchTerm, {
      type: 'websearch',
    })
    .limit(10);

  if (error) {
    console.error('Error matching workouts:', error);
    return [];
  }
  return data || [];
}

// Helper function to parse the generated content into workout objects
function parseWorkoutsFromContent(content, preferences) {
  // Split content by days or sections
  const sections = content.split(/Day \d+:|Workout \d+:|Session \d+:/g).filter(Boolean);

  return sections.map((section, index) => {
    // Extract title if available
    const titleMatch = section.match(/Title:?\s*["']?([^"'\n]+)["']?/i);
    const title = titleMatch ? titleMatch[1].trim() : `Workout ${index + 1}`;

    return {
      title: title,
      description: section.trim(),
      type: determineWorkoutType(section),
      duration: preferences.duration || '60 minutes',
      difficulty: preferences.difficulty || 'Intermediate',
      day: index + 1,
      focus: preferences.focusArea || '',
    };
  });
}

// Helper function to determine workout type based on content
function determineWorkoutType(content) {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('amrap')) return 'AMRAP';
  if (lowerContent.includes('emom')) return 'EMOM';
  if (lowerContent.includes('for time')) return 'For Time';
  if (lowerContent.includes('strength') && !lowerContent.includes('metcon')) return 'Strength';
  if (lowerContent.includes('hypertrophy')) return 'Hypertrophy';
  if (lowerContent.includes('endurance')) return 'Endurance';
  if (lowerContent.includes('tabata')) return 'Tabata';
  if (lowerContent.includes('circuit')) return 'Circuit';

  return 'Mixed';
}
