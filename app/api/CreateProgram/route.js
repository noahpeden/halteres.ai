import { NextResponse } from 'next/server';
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
    const body = await req.json();
    const {
      name,
      duration_weeks,
      days_per_week,
      start_date,
      end_date,
      days_of_week,
      entity_id,
      description,
      goal,
      experience,
      training_methodology,
      difficulty,
      focus_area,
      gym_type,
      equipment,
      workout_formats,
      reference_input,
      recent_training_history,
      program_influences,
      program_type,
      workout_duration,
      gym_id: providedGymId,
      useImperial, // optional preference forwarded to generation
    } = body;

    // Minimal required input for self-coached flow: program name
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Use mobile-compatible client that supports bearer tokens
    const supabase = await createMobileCompatibleClient(req);

    // Authenticate using getUser (works with bearer tokens from mobile)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        {
          status: 401,
          headers: corsHeaders(),
        }
      );
    }
    const userId = user.id;

    // Helper to compute default training days based on days_per_week
    function defaultDaysOfWeek(count) {
      const c = Math.max(1, Math.min(7, Number.isFinite(count) ? count : 3));
      switch (c) {
        case 1:
          return [1]; // Mon
        case 2:
          return [1, 4]; // Mon, Thu
        case 3:
          return [1, 3, 5]; // Mon, Wed, Fri
        case 4:
          return [1, 2, 4, 5]; // Mon, Tue, Thu, Fri
        case 5:
          return [1, 2, 3, 4, 5]; // Mon-Fri
        case 6:
          return [1, 2, 3, 4, 5, 6]; // Mon-Sat
        case 7:
        default:
          return [0, 1, 2, 3, 4, 5, 6]; // Every day
      }
    }

    // Compute start_date (default today, YYYY-MM-DD)
    const startDate =
      start_date ||
      new Date().toISOString().split('T')[0];

    // Compute duration (default 8 weeks)
    const durationWeeks = parseInt(duration_weeks || 8, 10);

    // Determine days_of_week; fallback from days_per_week if not provided
    const normalizedDaysOfWeek =
      (Array.isArray(days_of_week) && days_of_week.filter((d) => d >= 0 && d <= 6))?.length > 0
        ? days_of_week
        : defaultDaysOfWeek(parseInt(days_per_week || 3, 10));

    // Compute end_date based on schedule (last scheduled workout date)
    function computeEndDate(startISO, dayNumbers, totalWorkouts) {
      const start = new Date(startISO);
      const current = new Date(start);
      let workoutsAdded = 0;
      let safety = 0;
      const maxDays = 7 * durationWeeks + 28; // safety buffer
      let last = startISO;
      while (workoutsAdded < totalWorkouts && safety < maxDays) {
        if (dayNumbers.includes(current.getDay())) {
          last = current.toISOString().split('T')[0];
          workoutsAdded++;
        }
        current.setDate(current.getDate() + 1);
        safety++;
      }
      return last;
    }

    const totalWorkouts =
      durationWeeks * (Array.isArray(normalizedDaysOfWeek) ? normalizedDaysOfWeek.length : 3);
    const endDate = end_date || computeEndDate(startDate, normalizedDaysOfWeek, totalWorkouts);

    // Check for recent duplicate programs to prevent double creation
    const { data: existingPrograms } = await supabase
      .from('programs')
      .select('id, name, created_at')
      .eq('entity_id', entity_id || '__placeholder__') // temporary; corrected after entity resolution
      .eq('name', name)
      .gte('created_at', new Date(Date.now() - 30000).toISOString()) // Last 30 seconds
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingPrograms && existingPrograms.length > 0) {
      console.log('Duplicate program creation prevented:', existingPrograms[0]);
      return NextResponse.json(
        {
          data: [existingPrograms[0]],
          message: 'Program already exists (duplicate prevented)',
        },
        {
          status: 200,
          headers: corsHeaders(),
        }
      );
    }

    // Resolve or create a self entity when entity_id is not provided
    let resolvedEntityId = entity_id || null;
    if (!resolvedEntityId) {
      // Reuse any existing CLIENT entity for this user
      const { data: existingEntity } = await supabase
        .from('entities')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'CLIENT')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingEntity?.id) {
        resolvedEntityId = existingEntity.id;
      } else {
        // Create a lightweight self entity
        const { data: newEntity, error: entityError } = await supabase
          .from('entities')
          .insert({
            name: 'Self',
            type: 'CLIENT',
          })
          .select('id')
          .single();
        if (entityError) {
          console.error('Failed to create self entity:', entityError);
          return NextResponse.json(
            { error: 'Failed to create self profile entity' },
            { status: 500, headers: corsHeaders() }
          );
        }
        resolvedEntityId = newEntity.id;
      }
    }

    // Now that we have a resolved entity, recompute duplicate check narrowly for name+entity within window
    const { data: dupPrograms } = await supabase
      .from('programs')
      .select('id, name, created_at')
      .eq('entity_id', resolvedEntityId)
      .eq('name', name)
      .gte('created_at', new Date(Date.now() - 30000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    if (dupPrograms && dupPrograms.length > 0) {
      console.log('Duplicate program creation prevented (post-entity):', dupPrograms[0]);
      return NextResponse.json(
        { data: [dupPrograms[0]], message: 'Program already exists (duplicate prevented)' },
        { status: 200, headers: corsHeaders() }
      );
    }

    // Get the coach's gym if gym_id not provided (self-coached likely has none)
    let gymId = providedGymId || null;
    if (!gymId) {
      const { data: gymMembership } = await supabase
        .from('gym_memberships')
        .select('gym_id')
        .eq('user_id', userId)
        .in('role', ['owner', 'coach'])
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      gymId = gymMembership?.gym_id || null;
    }

    // Build merged reference input: base + influences + recent history
    const influenceText =
      Array.isArray(program_influences) && program_influences.length > 0
        ? program_influences.join(', ')
        : typeof program_influences === 'string'
          ? program_influences
          : '';
    const historyText =
      typeof recent_training_history === 'string' ? recent_training_history : '';
    let mergedReferenceInput = reference_input || '';
    if (influenceText) {
      mergedReferenceInput += `${mergedReferenceInput ? '\n\n' : ''}Program Influences / Styles:\n---\n${influenceText}\n---`;
    }
    if (historyText) {
      mergedReferenceInput += `${mergedReferenceInput ? '\n\n' : ''}Recent Training History (last 2-3 months):\n---\n${historyText}\n---`;
    }

    // Create program using the provided entity_id and all wizard data
    const { data, error } = await supabase
      .from('programs')
      .insert({
        name,
        entity_id: resolvedEntityId,
        gym_id: gymId,
        duration_weeks: durationWeeks,
        description: description || null,
        training_methodology: training_methodology || null,
        difficulty: difficulty || experience || 'intermediate',
        focus_area: focus_area || null,
        reference_input: mergedReferenceInput || null,
        goal: goal || null,
        generation_status: 'pending',
        // Save calendar data as JSON
        calendar_data: {
          start_date: startDate,
          end_date: endDate,
          days_of_week: normalizedDaysOfWeek,
          days_per_week: Array.isArray(normalizedDaysOfWeek)
            ? normalizedDaysOfWeek.length
            : parseInt(days_per_week || 3, 10),
        },
        // Save periodization type
        periodization: {
          program_type: program_type || 'linear',
        },
        // Save gym and equipment details in JSON column
        gym_details: {
          gym_type: gym_type || null,
          equipment: equipment || [],
        },
        // Save workout format preferences
        workout_format: {
          formats: workout_formats || [],
        },
        // Save session details
        session_details: {
          duration_minutes: workout_duration || 60,
          useImperial: useImperial !== undefined ? !!useImperial : true,
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Program creation error:', error);
      return NextResponse.json(
        { error: error.message },
        {
          status: 500,
          headers: corsHeaders(),
        }
      );
    }

    console.log('Program created:', data);
    return NextResponse.json(
      { data: [data] },
      {
        status: 200,
        headers: corsHeaders(),
      }
    );
  } catch (error) {
    console.error('Request failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}
