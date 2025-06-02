import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Helper function to check if today is a new day compared to the last generation date
function isNewDay(lastGenerationDateStr) {
  if (!lastGenerationDateStr) return true; // No previous generation, so it's a "new" day
  const today = new Date();
  const lastDate = new Date(lastGenerationDateStr);
  // Compare year, month, and day
  return (
    today.getFullYear() !== lastDate.getFullYear() ||
    today.getMonth() !== lastDate.getMonth() ||
    today.getDate() !== lastDate.getDate()
  );
}

export async function middleware(req) {
  const res = NextResponse.next();

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get user session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  const { pathname } = req.nextUrl;

  // Define protected routes that require an active subscription or valid trial
  const protectedRoutes = ['/dashboard', '/program', '/write-program'];

  // Define routes related to the generation API/action
  const generationActionRoutes = [
    '/api/generate-program',
    '/api/generate-workouts',
    '/api/generate-workouts-anthropic',
    '/api/generate-workouts-deepseek',
    '/api/generate-program-anthropic',
    '/api/generate-program-deepseek',
  ];

  // Check if this is a public sharing route
  // Pattern: /program/{programId}/workouts/{workoutId} or /program/{programId}/share
  const isPublicWorkoutRoute = /^\/program\/[^\/]+\/workouts\/[^\/]+$/.test(pathname);
  const isPublicProgramRoute = /^\/program\/[^\/]+\/share$/.test(pathname);
  const isPublicRoute = isPublicWorkoutRoute || isPublicProgramRoute;
  
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  ) && !isPublicRoute; // Exclude public routes from protection
  
  const isGenerationRoute = generationActionRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow access to public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/webhooks') ||
    pathname === '/' ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/features') ||
    (!isProtectedRoute && !isGenerationRoute)
  ) {
    return res;
  }

  // If trying to access a protected route without being logged in, redirect to login
  if (!user && (isProtectedRoute || isGenerationRoute)) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // User is logged in, check subscription status for protected/generation routes
  if (user && (isProtectedRoute || isGenerationRoute)) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'subscription_status, trial_end_date, generations_remaining, generations_today, last_generation_date'
        )
        .eq('id', user.id)
        .single();

      if (!profile) {
        // Profile not found
        const redirectUrl = new URL('/pricing', req.url);
        redirectUrl.searchParams.set('error', 'profile_not_found');
        return NextResponse.redirect(redirectUrl);
      }

      const {
        subscription_status,
        trial_end_date,
        generations_remaining,
        generations_today,
        last_generation_date,
      } = profile;

      const isActive = subscription_status === 'active';
      const isTrialing = subscription_status === 'trialing';
      const trialExpired = trial_end_date
        ? new Date(trial_end_date) < new Date()
        : true;

      // --- Generation Route Specific Checks ---
      if (isGenerationRoute) {
        if (isActive) {
          return res; // Allow generation for active subscribers
        }

        if (isTrialing && !trialExpired) {
          // Check total trial generations remaining
          if (generations_remaining <= 0) {
            const redirectUrl = new URL('/pricing', req.url);
            redirectUrl.searchParams.set('reason', 'trial_limit_total');
            return NextResponse.redirect(redirectUrl);
          }

          // Check daily trial generations
          let currentDailyGenerations = generations_today;
          if (isNewDay(last_generation_date)) {
            currentDailyGenerations = 0;
          }

          if (currentDailyGenerations >= 5) {
            const redirectUrl = new URL('/pricing', req.url);
            redirectUrl.searchParams.set('reason', 'trial_limit_daily');
            return NextResponse.redirect(redirectUrl);
          }

          return res; // Allow generation for valid trial
        }

        // If not active and not on a valid trial, deny generation access
        const redirectUrl = new URL('/pricing', req.url);
        redirectUrl.searchParams.set('reason', 'subscription_required');
        return NextResponse.redirect(redirectUrl);
      }

      // --- General Protected Route Checks (Non-Generation) ---
      if (isActive || (isTrialing && !trialExpired)) {
        return res; // Allow access to general protected routes
      }

      // If not active or on valid trial, redirect to pricing
      const redirectUrl = new URL('/pricing', req.url);
      redirectUrl.searchParams.set('reason', 'access_denied');
      return NextResponse.redirect(redirectUrl);
    } catch (error) {
      // Error occurred, redirect to login as fallback
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Default fallback
  return res;
}

// Configure middleware matching
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/program/:path*',
    '/write-program/:path*',
    '/api/generate-program/:path*',
    '/api/generate-workouts/:path*',
  ],
};
