import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(req) {
  try {
    // Check authentication using getUser() for bearer token compatibility
    // NOTE: getSession() doesn't work with bearer tokens from mobile apps
    // Always use getUser() when authenticating requests that may come from mobile
    const supabase = await createMobileCompatibleClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Not authenticated' },
        {
          status: 401,
          headers: corsHeaders(),
        }
      );
    }
    const body = await req.json();
    const {
      workout, // { title, description, ... }
      instructions, // string from user
      methodology, // string
      gymEquipment, // array or string
      injuries, // array or string
    } = body;

    if (!workout || !instructions || !methodology || !gymEquipment) {
      return NextResponse.json(
        {
          error: 'Missing required fields: workout, instructions, methodology, gymEquipment',
        },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Compose the enhancement prompt
    const systemPrompt = `
You are an expert fitness coach who specializes in creating and enhancing effective, personalized workout programs. Always consider evidence-based training principles, safety, and client context.`;

    const userPrompt = `
Enhance the following workout according to these user instructions: "${instructions}".

Context:
- Training methodology: ${methodology}
- Equipment available: ${Array.isArray(gymEquipment) ? gymEquipment.join(', ') : gymEquipment}
- Client injuries or limitations: ${
      injuries && injuries.length
        ? Array.isArray(injuries)
          ? injuries.join(', ')
          : injuries
        : 'None'
    }

Original Workout:
Title: ${workout.title || ''}
Description:
${workout.description || ''}

Requirements:
- Make improvements or modifications as needed to address the user instructions, methodology, equipment, and injuries.
- Ensure the workout is safe, effective, and practical for the given context.
- If the user asks for a specific enhancement, prioritize that, but do not ignore safety or context.
- If the workout is already optimal, make only minor improvements and explain them in the notes.
- Return your response as a JSON object with the following fields:
  - title: (string, required)
  - description: (string, required, detailed workout plan)
  - notes: (string, optional, explain any key changes or rationale)
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
      max_tokens: 2500,
    });

    let enhancedWorkout;
    const rawContent = response.choices[0]?.message?.content;
    try {
      if (!rawContent) {
        console.error('No content in AI response:', JSON.stringify(response.choices[0]));
        throw new Error('No content in AI response');
      }
      enhancedWorkout = JSON.parse(rawContent);
      if (!enhancedWorkout.title || !enhancedWorkout.description) {
        console.error('Missing required fields in AI response:', rawContent);
        throw new Error('Invalid workout format - missing title or description');
      }
    } catch (err) {
      console.error('Error parsing AI response:', err.message, 'Raw content:', rawContent);
      return NextResponse.json(
        { error: `Failed to parse enhanced workout from AI response: ${err.message}` },
        {
          status: 500,
          headers: corsHeaders(),
        }
      );
    }

    return NextResponse.json(
      { enhancedWorkout },
      {
        status: 200,
        headers: corsHeaders(),
      }
    );
  } catch (error) {
    console.error('Error enhancing workout:', error);
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}
