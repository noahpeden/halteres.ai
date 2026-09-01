import { NextResponse } from 'next/server';
import {
  hydrateAthleteFileFromProfile,
  normalizeAthleteFile,
} from '@/utils/prompt-builder/athleteFile.js';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';
import { isClerkUserId, loadOwnProfile } from '@/utils/supabase/ownProfile.js';

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders() });
}

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}

async function requireUser(request) {
  const supabase = await createMobileCompatibleClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      supabase,
      user: null,
      error: json({ success: false, error: 'Not authenticated' }, 401),
    };
  }
  return { supabase, user, error: null };
}

export async function GET(request) {
  const { supabase, user, error } = await requireUser(request);
  if (error) return error;

  const { data: profile, error: profileError } = await loadOwnProfile(supabase, user);
  if (profileError) {
    return json({ success: false, error: 'Failed to load your numbers' }, 500);
  }

  return json({
    success: true,
    athleteFile: hydrateAthleteFileFromProfile(profile),
    profileId: profile?.id || null,
  });
}

export async function PUT(request) {
  const { supabase, user, error } = await requireUser(request);
  if (error) return error;

  const { data: profile, error: profileError } = await loadOwnProfile(supabase, user);
  if (profileError) {
    return json({ success: false, error: 'Failed to load your profile' }, 500);
  }
  if (!profile?.id || isClerkUserId(profile.id)) {
    return json({ success: false, error: 'Your profile could not be found' }, 404);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const athleteFile = normalizeAthleteFile({
    ...body,
    updated_at: new Date().toISOString(),
  });

  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({ athlete_file: athleteFile, updated_at: athleteFile.updated_at })
    .eq('id', profile.id)
    .select('id, athlete_file')
    .single();

  if (updateError) {
    const missingColumn = /athlete_file/.test(updateError.message || '');
    return json(
      {
        success: false,
        error: missingColumn
          ? 'Your numbers column is not on profiles yet. Run the athlete_file SQL first.'
          : 'Failed to save your numbers',
      },
      missingColumn ? 409 : 500
    );
  }

  return json({
    success: true,
    athleteFile: normalizeAthleteFile(data?.athlete_file || athleteFile),
    profileId: data?.id || profile.id,
  });
}
