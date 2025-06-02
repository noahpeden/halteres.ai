import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      workouts, // array of workouts { id, title, body, ... }
      instructions, // string from user
      programName, // string
      methodology, // string
      gymEquipment, // array or string
      injuries, // array or string
      focusArea, // string
      workoutFormats, // array of workout formats
    } = body;

    if (!workouts || !instructions || !methodology || !gymEquipment) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: workouts, instructions, methodology, gymEquipment',
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Compose the enhancement prompt
    const systemPrompt = `
You are an expert fitness coach who specializes in creating and enhancing effective, personalized workout programs. Always consider evidence-based training principles, safety, and client context. You understand program periodization, progressive overload, and how to adapt programs to specific needs.`;

    // Format workouts for the prompt
    const workoutsText = workouts
      .map((w, index) => `
Workout ${index + 1} - ${w.title || `Day ${index + 1}`}:
${w.body || w.description || 'No content'}
`)
      .join('\n---\n');

    const userPrompt = `
Enhance the following program according to these user instructions: "${instructions}".

Program Name: ${programName || 'Untitled Program'}
Total Workouts: ${workouts.length}

Context:
- Training methodology: ${methodology}
- Focus area: ${focusArea || 'General fitness'}
- Equipment available: ${
      Array.isArray(gymEquipment) ? gymEquipment.join(', ') : gymEquipment
    }
- Workout formats preferred: ${
      Array.isArray(workoutFormats) ? workoutFormats.join(', ') : 'Standard'
    }
- Client injuries or limitations: ${
      injuries && injuries.length
        ? Array.isArray(injuries)
          ? injuries.join(', ')
          : injuries
        : 'None'
    }

Current Program Workouts:
${workoutsText}

Requirements:
1. Enhance ALL workouts in the program to address the user's instructions
2. Maintain the same number of workouts (${workouts.length} total)
3. Keep workout titles similar but update if needed to reflect changes
4. Ensure proper program progression and periodization
5. Make the program cohesive - workouts should complement each other
6. Consider the methodology, equipment, and any injuries throughout
7. If the user asks for specific changes (e.g., "add more metcons"), prioritize that
8. Maintain safety and effectiveness

Return your response as a JSON object with:
{
  "enhancedWorkouts": [
    {
      "id": "original workout id",
      "title": "enhanced title",
      "body": "enhanced workout content with proper formatting"
    },
    ... for all ${workouts.length} workouts
  ],
  "notes": "Brief explanation of key changes made to the program"
}

IMPORTANT: You must return exactly ${workouts.length} enhanced workouts, one for each original workout.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    });

    let enhancedProgram;
    try {
      enhancedProgram = JSON.parse(response.choices[0].message.content);
      
      // Validate the response
      if (!enhancedProgram.enhancedWorkouts || !Array.isArray(enhancedProgram.enhancedWorkouts)) {
        throw new Error('Invalid program format - missing enhancedWorkouts array');
      }
      
      if (enhancedProgram.enhancedWorkouts.length !== workouts.length) {
        throw new Error(`Expected ${workouts.length} workouts but received ${enhancedProgram.enhancedWorkouts.length}`);
      }
      
      // Ensure all workouts have required fields
      enhancedProgram.enhancedWorkouts.forEach((w, index) => {
        if (!w.title || !w.body) {
          throw new Error(`Workout ${index + 1} missing required fields`);
        }
        // Preserve original workout ID
        if (!w.id && workouts[index].id) {
          w.id = workouts[index].id;
        }
      });
      
    } catch (err) {
      console.error('Parse error:', err);
      return NextResponse.json(
        { error: 'Failed to parse enhanced program from AI response: ' + err.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ enhancedProgram }, { status: 200 });
  } catch (error) {
    console.error('Error enhancing program:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}