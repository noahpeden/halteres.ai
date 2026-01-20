import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export async function POST(request) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Only allow certain fields to be updated by the athlete
    const allowedFields = [
      'display_name',
      'squat_1rm',
      'deadlift_1rm',
      'bench_1rm',
      'mile_time',
      'weight_kg',
      'height_cm',
      'onboarding_completed',
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined && body[field] !== '') {
        // Convert numeric fields
        if (['squat_1rm', 'deadlift_1rm', 'bench_1rm', 'weight_kg', 'height_cm'].includes(field)) {
          updateData[field] = parseFloat(body[field]) || null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
