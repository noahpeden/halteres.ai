import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { DeepseekLM } from '@deepseek-ai/node';
import {
  logWithTimestamp,
  extractParameters,
  generateSuggestedDates,
  formatClientMetrics,
  formatReferenceWorkouts,
  hasInjuryHistory as checkInjuryHistory,
  buildPrompt,
  getSystemPrompt,
  normalizeResponse,
} from '@/utils/api/programGeneration';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  logWithTimestamp('API route started (Deepseek)');

  try {
    const deepseekClient = new DeepseekLM({
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
    logWithTimestamp('DeepseekLM client initialized');

    const supabase = await createClient();
    logWithTimestamp('Supabase client initialized');

    const requestData = await request.json();
    logWithTimestamp('Request data received', requestData);

    // Extract parameters using shared utility
    const params = extractParameters(requestData);
    logWithTimestamp('Parsed parameters', {
      numberOfWeeks: params.numberOfWeeks,
      daysPerWeek: params.daysPerWeek,
      programType: params.programType,
      goal: params.goal,
      difficulty: params.difficulty,
    });

    // Generate suggested dates
    const suggestedDates = generateSuggestedDates(
      params.selectedDaysOfWeek,
      params.totalWorkouts,
      params.startDate
    );

    // Verify user access to the program
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      logWithTimestamp('Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    logWithTimestamp('Authentication successful', { userId: session.user.id });

    // Fetch client metrics if program ID exists
    let clientMetricsContent = '';
    let entityData;
    if (params.programId) {
      try {
        logWithTimestamp('Fetching client metrics', {
          programId: params.programId,
        });

        // Get entity_id from the program
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('entity_id')
          .eq('id', params.programId)
          .single();

        if (programError) {
          logWithTimestamp('Error fetching program entity_id', {
            error: programError,
          });
        } else if (programData && programData.entity_id) {
          // Fetch metrics from entities table
          const { data: entityResult, error: entityError } = await supabase
            .from('entities')
            .select('*')
            .eq('id', programData.entity_id)
            .single();

          if (entityError) {
            logWithTimestamp('Error fetching client metrics', {
              error: entityError,
            });
          } else if (entityResult) {
            entityData = entityResult;
            logWithTimestamp('Found client metrics', { entityData });
            clientMetricsContent = formatClientMetrics(entityData);
          }
        }
      } catch (err) {
        logWithTimestamp('Error processing client metrics', {
          error: err.message,
        });
      }
    }

    // Check if injury history exists
    const hasInjuryHistoryValue = checkInjuryHistory(entityData);
    logWithTimestamp('Injury history check', { hasInjuryHistoryValue });

    // Fetch reference workouts if program ID exists
    let referenceWorkoutsContent = '';
    if (params.programId) {
      try {
        logWithTimestamp('Fetching reference workouts', {
          programId: params.programId,
        });

        const { data: referenceWorkouts, error: referenceError } =
          await supabase
            .from('program_workouts')
            .select('title, body, tags')
            .eq('program_id', params.programId)
            .eq('is_reference', true)
            .order('created_at', { ascending: false });

        if (referenceError) {
          logWithTimestamp('Error fetching reference workouts', {
            error: referenceError,
          });
        } else if (referenceWorkouts && referenceWorkouts.length > 0) {
          logWithTimestamp('Found reference workouts', {
            count: referenceWorkouts.length,
          });
          referenceWorkoutsContent = formatReferenceWorkouts(referenceWorkouts);
        } else {
          logWithTimestamp('No reference workouts found');
        }
      } catch (err) {
        logWithTimestamp('Error processing reference workouts', {
          error: err.message,
        });
      }
    }

    // Get the day names from the day numbers for the prompt
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const selectedDayNames = params.selectedDaysOfWeek
      .map((dayNum) => dayNames[dayNum])
      .join(', ');

    // Build the prompt using shared utility
    const prompt = buildPrompt({
      ...params,
      selectedDayNames,
      clientMetricsContent,
      referenceWorkoutsContent,
      suggestedDates,
      hasInjuryHistoryValue,
    });

    logWithTimestamp('Prompt prepared', { promptLength: prompt.length });

    // Get system prompt from shared utility
    const systemPrompt = getSystemPrompt();

    // Call Deepseek
    try {
      const response = await deepseekClient.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      logWithTimestamp('Received response from Deepseek');

      if (
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        logWithTimestamp('Invalid response format from Deepseek', response);
        return NextResponse.json(
          { error: 'Failed to generate a valid program: Invalid API response' },
          { status: 500 }
        );
      }

      // Parse the response
      const responseContent = response.choices[0].message.content;
      logWithTimestamp('Response content length', {
        length: responseContent.length,
      });

      try {
        // Use shared utility to normalize the response
        const normalizedResponse = normalizeResponse(responseContent);
        logWithTimestamp('Successfully normalized response');
        return NextResponse.json(normalizedResponse, { status: 200 });
      } catch (parseError) {
        logWithTimestamp('Failed to parse JSON response', {
          error: parseError.message,
          preview: responseContent.substring(0, 200) + '...',
        });
        return NextResponse.json(
          {
            error: 'Failed to parse AI response',
            rawResponse: responseContent,
          },
          { status: 500 }
        );
      }
    } catch (deepseekError) {
      logWithTimestamp('Deepseek API error', {
        error: deepseekError.message,
        stack: deepseekError.stack,
      });
      return NextResponse.json(
        { error: 'Deepseek API error: ' + deepseekError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    logWithTimestamp('Unhandled error in API route', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to generate program: ' + error.message },
      { status: 500 }
    );
  }
}
