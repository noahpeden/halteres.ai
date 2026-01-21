import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createMobileCompatibleClient, corsHeaders } from '@/utils/supabase/mobile';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders()
  });
}

export async function POST(req) {
  try {
    // Check authentication using getUser() for bearer token compatibility
    // NOTE: getSession() doesn't work with bearer tokens from mobile apps
    // Always use getUser() when authenticating requests that may come from mobile
    const supabase = await createMobileCompatibleClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Not authenticated' },
        {
          status: 401,
          headers: corsHeaders()
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
          error:
            'Missing required fields: workout, instructions, methodology, gymEquipment',
        },
        {
          status: 400,
          headers: corsHeaders()
        }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Compose the enhancement prompt
    const systemPrompt = `You are an expert fitness coach who specializes in creating and enhancing effective, personalized workout programs. Always consider evidence-based training principles, safety, and client context.

You must respond with valid JSON only, no additional text or markdown.`;

    const userPrompt = `Enhance the following workout according to these user instructions: "${instructions}".

Context:
- Training methodology: ${methodology}
- Equipment available: ${
      Array.isArray(gymEquipment) ? gymEquipment.join(', ') : gymEquipment
    }
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

Respond with ONLY the JSON object, no markdown code blocks or other text.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20250929',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    let enhancedWorkout;
    try {
      // Extract text content from Anthropic response
      const textContent = response.content.find(block => block.type === 'text');
      if (!textContent || !textContent.text) {
        throw new Error('No text content in response');
      }

      let jsonContent = textContent.text.trim();

      // Strip markdown code blocks if present
      if (jsonContent.includes('```')) {
        const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n```|$)/);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          jsonContent = jsonBlockMatch[1].trim();
        }
      }

      enhancedWorkout = JSON.parse(jsonContent);
      if (!enhancedWorkout.title || !enhancedWorkout.description) {
        throw new Error('Invalid workout format');
      }
    } catch (err) {
      console.error('Parse error:', err, 'Response:', response.content);
      return NextResponse.json(
        { error: 'Failed to parse enhanced workout from AI response.' },
        {
          status: 500,
          headers: corsHeaders()
        }
      );
    }

    return NextResponse.json(
      { enhancedWorkout },
      {
        status: 200,
        headers: corsHeaders()
      }
    );
  } catch (error) {
    console.error('Error enhancing workout:', error);
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: corsHeaders()
      }
    );
  }
}
