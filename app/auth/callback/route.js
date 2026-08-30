import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const isReset = requestUrl.searchParams.get('reset') === 'true';
  const roleParam = requestUrl.searchParams.get('role');
  const gymCodeParam = requestUrl.searchParams.get('gymCode');

  console.log('Auth callback received:', {
    code: code ? 'exists' : 'missing',
    isReset,
    roleParam,
    gymCodeParam: gymCodeParam ? 'exists' : 'missing',
  });

  // If there's no code, redirect to login
  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = await createClient();

  // Exchange the code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // If there's an error, redirect to login
  if (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  // For password reset requests, redirect to reset-password page
  if (isReset) {
    console.log('Password reset flow detected, redirecting to reset-password');
    return NextResponse.redirect(new URL('/reset-password?auth=success', request.url));
  }

  // Get the user to determine their role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if this is a new signup with role metadata
    const userMetadata = user.user_metadata;
    const roleFromMetadata = userMetadata?.role;
    const gymCodeFromMetadata = userMetadata?.gym_invite_code;

    // Use role from URL params, metadata, or fallback to checking profile
    const signupRole = roleParam || roleFromMetadata;
    const signupGymCode = gymCodeParam || gymCodeFromMetadata;

    console.log('Processing signup:', {
      signupRole,
      hasGymCode: !!signupGymCode,
    });

    // If we have a role from signup, ensure profile exists and update it
    if (signupRole) {
      // First check if profile exists (trigger may have failed)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Profile wasn't created by trigger - create it now
        console.log('Profile missing for user, creating fallback profile');
        const profileData =
          signupRole === 'athlete'
            ? {
                id: user.id,
                role: 'athlete',
                subscription_status: 'trialing',
                trial_start_date: new Date().toISOString(),
                trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                generations_remaining: 15,
                generations_today: 0,
                is_active: true,
                onboarding_completed: false,
              }
            : {
                id: user.id,
                role: 'coach',
                subscription_status: 'trialing',
                trial_start_date: new Date().toISOString(),
                trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                generations_remaining: 15,
                generations_today: 0,
                is_active: true,
                onboarding_completed: false,
              };

        const { error: insertError } = await supabase.from('profiles').insert([profileData]);

        if (insertError) {
          console.error('Error creating fallback profile:', insertError);
        } else {
          console.log('Fallback profile created for role:', signupRole);
        }
      } else {
        // Profile exists, just update the role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: signupRole })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating profile role:', updateError);
        } else {
          console.log('Profile role updated to:', signupRole);
        }
      }

      // If athlete with gym code, auto-join the gym (always auto-approve, no approval process)
      if (signupRole === 'athlete' && signupGymCode) {
        try {
          // Find gym by invite code
          const { data: gym, error: gymError } = await supabase
            .from('gyms')
            .select('id, name')
            .eq('invite_code', signupGymCode.toUpperCase())
            .is('deleted_at', null)
            .single();

          if (gym && !gymError) {
            // Check if already a member
            const { data: existingMembership } = await supabase
              .from('gym_memberships')
              .select('id')
              .eq('gym_id', gym.id)
              .eq('user_id', user.id)
              .single();

            if (!existingMembership) {
              // Create membership - always active (no approval process)
              const { error: membershipError } = await supabase.from('gym_memberships').insert([
                {
                  gym_id: gym.id,
                  user_id: user.id,
                  role: 'athlete',
                  status: 'active',
                  joined_at: new Date().toISOString(),
                },
              ]);

              if (membershipError) {
                console.error('Error creating gym membership:', membershipError);
              } else {
                console.log('Auto-joined gym:', gym.name);
              }
            }
          } else {
            console.error('Gym not found for code:', signupGymCode);
          }
        } catch (err) {
          console.error('Error auto-joining gym:', err);
        }
      }

      // Redirect based on signup role
      if (signupRole === 'athlete') {
        return NextResponse.redirect(new URL('/athlete', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Existing user - fetch profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Redirect based on role
    if (profile?.role === 'athlete') {
      return NextResponse.redirect(new URL('/athlete', request.url));
    }
  }

  // Default: redirect to dashboard (coaches and users without profile)
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
