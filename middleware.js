import { clerkMiddleware } from '@clerk/nextjs/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  isValidClerkPublishableKey,
  readClerkPublishableKey,
  readClerkSecretKey,
} from './app/utils/clerk/runtimeKeys';

function isNewDay(lastGenerationDateStr) {
  if (!lastGenerationDateStr) return true;
  const today = new Date();
  const lastDate = new Date(lastGenerationDateStr);
  return (
    today.getFullYear() !== lastDate.getFullYear() ||
    today.getMonth() !== lastDate.getMonth() ||
    today.getDate() !== lastDate.getDate()
  );
}

function looksLikeUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id || ''
  );
}

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function applyB2CArchiveRedirects(req) {
  const { pathname } = req.nextUrl;
  const programMatch = pathname.match(/^\/program\/([^/]+)\/(workouts|metrics|share)(?:\/.*)?$/);
  if (programMatch) {
    return NextResponse.redirect(new URL(`/program/${programMatch[1]}/writer`, req.url));
  }
  if (
    /^\/program-wizard(\/.*)?$/.test(pathname) ||
    /^\/(help|tutorials|updates|_team)$/.test(pathname)
  ) {
    return NextResponse.redirect(new URL('/athlete', req.url));
  }
  if (pathname === '/profile') {
    return NextResponse.redirect(new URL('/athlete/profile', req.url));
  }
  return null;
}

async function clerkHandler(auth, req) {
  const archived = applyB2CArchiveRedirects(req);
  if (archived) return archived;

  const res = NextResponse.next();
  const { userId, getToken } = await auth();
  const user = userId ? { id: userId } : null;
  const { pathname } = req.nextUrl;

  const protectedRoutes = ['/dashboard', '/program', '/write-program'];
  const generationActionRoutes = [
    '/api/generate-program',
    '/api/generate-workouts',
    '/api/generate-workouts-anthropic',
    '/api/generate-workouts-deepseek',
    '/api/generate-program-anthropic',
    '/api/generate-program-deepseek',
  ];

  const isPublicWorkoutRoute = /^\/program\/[^/]+\/workout\/[^/]+$/.test(pathname);
  const isPublicProgramRoute = /^\/program\/[^/]+\/share$/.test(pathname);
  const isPublicRoute = isPublicWorkoutRoute || isPublicProgramRoute;
  const isProtectedRoute =
    protectedRoutes.some((route) => pathname.startsWith(route)) && !isPublicRoute;
  const isGenerationRoute = generationActionRoutes.some((route) => pathname.startsWith(route));

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/api/webhooks') ||
    pathname === '/' ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/features') ||
    (!isProtectedRoute && !isGenerationRoute)
  ) {
    return res;
  }

  if (!user && (isProtectedRoute || isGenerationRoute)) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const coachOnlyRoutes = ['/dashboard', '/write-program'];
  const isCoachOnlyRoute =
    coachOnlyRoutes.some((route) => pathname.startsWith(route)) && !isPublicRoute;
  const athleteRoutes = ['/athlete'];
  const isAthleteRoute = athleteRoutes.some((route) => pathname.startsWith(route));
  const isAthleteSetupRoute = pathname === '/athlete';

  if (user && (isProtectedRoute || isGenerationRoute || isAthleteRoute)) {
    try {
      const supabaseToken = (await getToken()) || (await getToken({ template: 'supabase' }));
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: { headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {} },
          auth: { persistSession: false, autoRefreshToken: false },
        }
      );

      const payload = decodeJwtPayload(supabaseToken || '');
      const email = payload.email || payload.email_address || null;
      const jwtSub = payload.sub || null;

      let profileQuery = supabase
        .from('profiles')
        .select(
          'subscription_status, trial_end_date, generations_remaining, generations_today, last_generation_date, role, onboarding_completed'
        );
      if (email) {
        profileQuery = profileQuery.eq('email', email);
      } else if (looksLikeUuid(jwtSub)) {
        profileQuery = profileQuery.eq('id', jwtSub);
      } else {
        profileQuery = null;
      }

      const { data: profile } = profileQuery
        ? await profileQuery.maybeSingle()
        : { data: null };

      const {
        subscription_status,
        trial_end_date,
        generations_remaining,
        generations_today,
        last_generation_date,
        role,
        onboarding_completed,
      } = profile || {};

      const isAthlete = (role || 'athlete') === 'athlete';

      if (isAthlete && isCoachOnlyRoute) {
        return NextResponse.redirect(new URL('/athlete', req.url));
      }

      if (isAthlete && isAthleteRoute && !isAthleteSetupRoute) {
        if (!onboarding_completed) {
          return NextResponse.redirect(new URL('/athlete', req.url));
        }
      }

      if (isAthlete && isAthleteRoute) {
        return res;
      }

      if (isAthlete && (isProtectedRoute || isGenerationRoute)) {
        return res;
      }

      const isActive = subscription_status === 'active';
      const isTrialing = subscription_status === 'trialing';
      const trialExpired = trial_end_date ? new Date(trial_end_date) < new Date() : true;

      if (isGenerationRoute) {
        if (isActive) return res;
        if (isTrialing && !trialExpired) {
          if (generations_remaining <= 0) {
            const redirectUrl = new URL('/pricing', req.url);
            redirectUrl.searchParams.set('reason', 'trial_limit_total');
            return NextResponse.redirect(redirectUrl);
          }
          let currentDailyGenerations = generations_today;
          if (isNewDay(last_generation_date)) currentDailyGenerations = 0;
          if (currentDailyGenerations >= 5) {
            const redirectUrl = new URL('/pricing', req.url);
            redirectUrl.searchParams.set('reason', 'trial_limit_daily');
            return NextResponse.redirect(redirectUrl);
          }
          return res;
        }
        const redirectUrl = new URL('/pricing', req.url);
        redirectUrl.searchParams.set('reason', 'subscription_required');
        return NextResponse.redirect(redirectUrl);
      }

      if (isActive || (isTrialing && !trialExpired)) {
        return res;
      }

      const redirectUrl = new URL('/pricing', req.url);
      redirectUrl.searchParams.set('reason', 'access_denied');
      return NextResponse.redirect(redirectUrl);
    } catch (_error) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return res;
}

let cachedClerkMiddleware = null;

function getClerkMiddleware() {
  if (!cachedClerkMiddleware) {
    cachedClerkMiddleware = clerkMiddleware(clerkHandler, () => ({
      publishableKey: readClerkPublishableKey(),
      secretKey: readClerkSecretKey(),
    }));
  }
  return cachedClerkMiddleware;
}

export default async function middleware(req, event) {
  const archived = applyB2CArchiveRedirects(req);
  if (archived) return archived;

  const publishableKey = readClerkPublishableKey();
  const secretKey = readClerkSecretKey();
  if (!isValidClerkPublishableKey(publishableKey) || !secretKey) {
    // Do not throw MIDDLEWARE_INVOCATION_FAILED when NEXT_PUBLIC was empty at build.
    // /login can still render; ClerkProvider reads keys at request time.
    return NextResponse.next();
  }

  return getClerkMiddleware()(req, event);
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/(api|trpc)(.*)'],
};
