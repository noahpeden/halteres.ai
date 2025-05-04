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

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  const user = session?.user;
  const { pathname } = req.nextUrl;

  // Define protected routes that require an active subscription or valid trial
  const protectedRoutes = [
    '/dashboard', // Example: Main dashboard
    '/program', // Example: Accessing programs
    '/write-program', // Main generation feature
    // Add other routes that need protection
  ];

  // Define routes related to the generation API/action
  // This needs stricter checks including daily/total limits
  const generationActionRoutes = [
    '/api/generate-program', // Example API route for generation
    // Add any other routes that *perform* a generation
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isGenerationRoute = generationActionRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow access to static assets, auth routes, public pages, and webhooks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') || // Assuming public assets
    pathname.startsWith('/auth') || // Auth callbacks, etc.
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/webhooks') ||
    pathname === '/' || // Homepage
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/features') ||
    // Add any other explicitly public paths
    (!isProtectedRoute && !isGenerationRoute) // Allow if not explicitly protected
  ) {
    return res; // Allow request to proceed
  }

  // If trying to access a protected route without being logged in, redirect to login
  if (!user && (isProtectedRoute || isGenerationRoute)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // User is logged in, check subscription status for protected/generation routes
  if (user && (isProtectedRoute || isGenerationRoute)) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'subscription_status, trial_end_date, generations_remaining, generations_today, last_generation_date'
      )
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(
        `Middleware: Error fetching profile for user ${user.id}:`,
        profileError
      );
      // Allow access but log error? Or redirect to an error page?
      // For now, let's redirect to pricing as a fallback, assuming profile fetch fail means no access.
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/pricing';
      redirectUrl.searchParams.set('error', 'profile_fetch_failed');
      return NextResponse.redirect(redirectUrl);
    }

    if (!profile) {
      console.error(
        `Middleware: Profile not found for user ${user.id}. Redirecting to pricing.`
      );
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/pricing';
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
      : true; // Treat missing end date as expired

    // --- Generation Route Specific Checks ---
    if (isGenerationRoute) {
      if (isActive) {
        // Active subscribers have unlimited generations
        return res; // Allow generation
      }

      if (isTrialing && !trialExpired) {
        // Check total trial generations remaining
        if (generations_remaining <= 0) {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = '/pricing';
          redirectUrl.searchParams.set('reason', 'trial_limit_total');
          return NextResponse.redirect(redirectUrl);
        }

        // Check daily trial generations
        // Need to reset daily count if it's a new day
        let currentDailyGenerations = generations_today;
        if (isNewDay(last_generation_date)) {
          // Technically, the middleware shouldn't update the DB directly.
          // The generation API itself should handle the reset and update.
          // For the check here, we assume the count *would* be reset.
          currentDailyGenerations = 0;
        }

        if (currentDailyGenerations >= 5) {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = '/pricing';
          redirectUrl.searchParams.set('reason', 'trial_limit_daily');
          return NextResponse.redirect(redirectUrl);
        }

        // If passes all trial checks
        return res; // Allow generation
      }

      // If not active and not on a valid trial, deny generation access
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/pricing';
      redirectUrl.searchParams.set('reason', 'subscription_required');
      return NextResponse.redirect(redirectUrl);
    }

    // --- General Protected Route Checks (Non-Generation) ---
    if (isProtectedRoute) {
      if (isActive || (isTrialing && !trialExpired)) {
        return res; // Allow access to general protected routes
      }

      // If not active or on valid trial, redirect to pricing
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/pricing';
      redirectUrl.searchParams.set('reason', 'access_denied');
      return NextResponse.redirect(redirectUrl);
    }

    // Fallback: Should not be reached if logic is correct, but deny access just in case.
    console.warn(
      `Middleware: Reached fallback for user ${user?.id} on path ${pathname}. Denying access.`
    );
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login'; // Or /pricing
    return NextResponse.redirect(redirectUrl);
  }
}

// Configure middleware matching: Apply to specific paths or exclude static files
// Adjust this matcher based on your specific needs.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api routes that shouldn't be checked by this middleware (like webhooks)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - assets (public assets)
     * - favicon.ico (favicon file)
     * - auth routes
     * - public pages like /, /pricing, /features, /contact
     * It's generally safer to list paths to PROTECT rather than exclude.
     */
    // Explicitly list paths to protect:
    '/dashboard/:path*',
    '/program/:path*',
    '/write-program/:path*',
    '/api/generate-program/:path*',
    // Add any other paths that require auth/subscription checks here

    // The previous negative lookahead is removed:
    // '/((?!api/webhooks|_next/static|_next/image|assets|favicon.ico|auth|login|pricing|features|contact|$).*)',
  ],
};
