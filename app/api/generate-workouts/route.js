import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      programId,
      programDetails,
      clientMetrics,
      preferences,
      office,
      whiteboard,
    } = body;
    const supabase = createClient();

    // Fetch program details if not provided
    let entityId;
    if (programDetails?.entity_id) {
      entityId = programDetails.entity_id;
    } else {
      // Fetch the program to get the entity_id
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('entity_id')
        .eq('id', programId)
        .single();

      if (programError) throw programError;
      entityId = program?.entity_id;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Get matched workouts if available
    let matchedWorkouts = [];
    if (whiteboard?.focus) {
      const focusEmbedding = await createEmbeddings(openai, whiteboard.focus);
      matchedWorkouts = await matchWorkouts(supabase, focusEmbedding);
    }

    // Create the user prompt
    const userPrompt = `
    Create a detailed workout program for a ${
      preferences.personalization || 'general athlete'
    } 
    for the next ${
      preferences.duration || '7'
    } days. The user has the following details:
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

    // System prompt for workout generation
    const systemPrompt = `
    As a knowledgeable fitness coach, create a comprehensive ${
      preferences.duration || '7'
    }-day workout plan 
    tailored to a ${
      preferences.personalization || 'general athlete'
    } with a focus on ${preferences.focusArea || 'general fitness'} 
    and a goal of ${preferences.goal || 'overall fitness'}.

    Follow this structure for each day's workout:

    1. Title: Create a unique, engaging title for each workout.

    2. Body: 
      - RX: Provide the main workout with specific weights and movements with options, percentages, and RPE for male and female.
      - Scaled: Offer a scaled version with adjusted weights and movement modifications.
      - RX+: Include a more challenging version for advanced athletes.

    3. Coaching Strategy:
      a. Time Frame: Break down the class structure (e.g., Intro, Warmup, Strength, Workout, Cooldown, Mobility).
      b. Target Score: Include target times and time caps for the workout.
      c. Stimulus and Goals: Describe the intended stimulus and overall goals of the workout.

    4. Workout Strategy & Flow:
      - For each movement, provide detailed strategies including:
        • Form cues
        • Pacing advice
        • Common faults to avoid
        • Specific weights for male and female athletes
      - Include coach's notes and suggestions for each strength and conditioning component.


    Key points to remember:
    - Each workout builds on the previous day's progress.
    - Make sure there is variety in movements and time domains.
    - Include benchmark workouts if appropriate to track progress.
    - Generate exactly ${preferences.duration || '7'} unique workouts.
    - Use the matched external workouts as references to inform your programming.
    - Include specific stretches and cool-down movements.
    - Ensure each day's workout is unique and specific, avoiding repetitions or generic instructions.
    - Use RPE (Rate of Perceived Exertion) scales to guide intensity levels as well as percentages of max lifts.
    - DO NOT USE ANY EQUIPMENT THAT IS NOT INCLUDED IN ${
      office?.equipmentList || 'standard gym equipment'
    }.
    - If the user has requested specific movements or types of workouts, incorporate those preferences.
    - If there are any quirks or special features mentioned, take those into account in the program creation.

    Your goal is to create a high-quality, personalized workout program that matches or exceeds the detail and specificity of professionally curated fitness workouts.
    `;

    // Generate workouts using OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const generatedContent = response.choices[0].message.content;

    // Parse the generated content into workout objects
    const workouts = parseWorkoutsFromContent(generatedContent, preferences);

    // Store the generated workouts in the program_workouts table
    for (const workout of workouts) {
      await supabase.from('program_workouts').insert({
        program_id: programId,
        entity_id: entityId,
        title: workout.title,
        body: workout.description || workout.content,
        workout_type: workout.type,
        difficulty: preferences.difficulty || 'intermediate',
        tags: {
          type: workout.type,
          focus: workout.focus || preferences.focusArea,
          generated: true,
        },
        scheduled_date: workout.date || workout.scheduled_date,
        notes: 'AI-generated workout',
      });
    }

    // Also store in workout_generations for reference
    const { data, error } = await supabase
      .from('workout_generations')
      .insert({
        program_id: programId,
        workout_data: workouts,
        raw_content: generatedContent,
        status: 'completed',
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;

    return NextResponse.json(
      { workouts, rawContent: generatedContent },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating workouts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to create embeddings
async function createEmbeddings(openai, text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  });

  return response.data[0].embedding;
}

// Helper function to match workouts
async function matchWorkouts(supabase, embedding) {
  const matchResult = await supabase.rpc('match_workouts', {
    query_embedding: embedding,
    match_threshold: 0.4,
    match_count: 10,
  });

  if (matchResult.error) {
    console.error('Error matching workouts:', matchResult.error);
    return [];
  }
  return matchResult.data;
}

// Helper function to parse the generated content into workout objects
function parseWorkoutsFromContent(content, preferences) {
  // Split content by days or sections
  const sections = content
    .split(/Day \d+:|Workout \d+:|Session \d+:/g)
    .filter(Boolean);

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
  if (lowerContent.includes('strength') && !lowerContent.includes('metcon'))
    return 'Strength';
  if (lowerContent.includes('hypertrophy')) return 'Hypertrophy';
  if (lowerContent.includes('endurance')) return 'Endurance';
  if (lowerContent.includes('tabata')) return 'Tabata';
  if (lowerContent.includes('circuit')) return 'Circuit';

  return 'Mixed';
}
