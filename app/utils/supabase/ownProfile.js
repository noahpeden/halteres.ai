import { hydrateAthleteFileFromProfile } from '@/utils/prompt-builder/athleteFile.js';

/**
 * Profiles are UUID rows (often created/found by email).
 * Never treat Clerk `user_...` ids as profiles.id.
 */
export function isClerkUserId(id) {
  return typeof id === 'string' && /^user_[A-Za-z0-9]+/.test(id);
}

export const PROFILE_ATHLETE_COLUMNS =
  'id, email, athlete_file, squat_1rm, bench_1rm, deadlift_1rm, weight_kg, injury_history';

function withoutAthleteFileColumn(columns) {
  return String(columns)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part !== 'athlete_file')
    .join(', ');
}

async function selectProfile(supabase, columns, match) {
  let result = await supabase.from('profiles').select(columns).match(match).maybeSingle();
  if (result.error && /athlete_file/.test(result.error.message || '')) {
    result = await supabase
      .from('profiles')
      .select(withoutAthleteFileColumn(columns))
      .match(match)
      .maybeSingle();
  }
  return result;
}

export async function loadOwnProfile(supabase, user, columns = PROFILE_ATHLETE_COLUMNS) {
  if (!supabase || !user) return { data: null, error: null };

  if (user.id && !isClerkUserId(user.id)) {
    const byId = await selectProfile(supabase, columns, { id: user.id });
    if (byId.data) return byId;
    if (byId.error && !/athlete_file/.test(byId.error.message || '')) {
      // Fall through to email — some rows are UUID-by-email.
    }
  }

  if (user.email) {
    return selectProfile(supabase, columns, { email: user.email });
  }

  return { data: null, error: null };
}

export async function loadAthleteFileForUser(supabase, user) {
  try {
    const { data } = await loadOwnProfile(supabase, user);
    return hydrateAthleteFileFromProfile(data);
  } catch {
    return hydrateAthleteFileFromProfile(null);
  }
}
