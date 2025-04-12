import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Helper function to read cookies (from @supabase/ssr docs)
function readCookie(request, name) {
  const cookie = request.cookies.get(name);
  return cookie ? cookie.value : null;
}

// --- Configuration ---
// Replace with your actual domains
const APP_HOSTNAME = 'app.halteres.ai';
const MAIN_HOSTNAME = 'www.halteres.ai'; // *** CONFIRM THIS *** or 'halteres.ai'

// Add ALL public paths here (paths accessible without login)
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/features',
  '/pricing',
  '/updates',
  '/help',
  '/contact',
  '/company' /* add others like /blog? */,
];
const PROTECTED_PATHS_PREFIX = ['/dashboard', '/program'];
// --- End Configuration ---

export async function middleware(req) {
  // Create an unmodified response object first
  let response = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // Instantiate Supabase client using createServerClient from @supabase/ssr
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // Define how cookies are read from the request
        get(name) {
          return readCookie(req, name); // Use helper
        },
        // Define how cookies are set on the response
        set(name, value, options) {
          // If the response is modified, cookies must be set on it
          response.cookies.set({ name, value, ...options });
        },
        // Define how cookies are removed from the response
        remove(name, options) {
          // If the response is modified, cookies must be removed from it
          response.cookies.set({ name, value: '', ...options });
        },
      },
      // IMPORTANT: Ensure cross-domain cookie options are set here too
      cookieOptions: {
        domain:
          process.env.NODE_ENV === 'production' ? '.halteres.ai' : undefined,
        path: '/',
        sameSite: 'Lax', // Explicitly set SameSite
        secure: process.env.NODE_ENV === 'production', // Only set secure in production
      },
    }
  );

  // Crucial: Refresh session AND get session data.
  // This also handles reading the cookie correctly via the 'get' method defined above.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  let hostname = req.headers.get('host'); // Get hostname from headers

  // Handle potential port (localhost:3000 -> localhost)
  if (hostname.includes(':')) {
    hostname = hostname.split(':')[0];
  }

  // Determine if we are on the app, main, or localhost domain
  const isAppDomain = hostname === APP_HOSTNAME;
  const isMainDomain = hostname === MAIN_HOSTNAME;
  const isLocalhost = hostname === 'localhost'; // Explicitly check for localhost

  const isProtectedRoute = PROTECTED_PATHS_PREFIX.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // --- Domain Handling ---

  // If on localhost, apply basic auth checks only (no domain redirects)
  if (isLocalhost) {
    if (isProtectedRoute && !session) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    if (pathname === '/login' && session) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    // Allow all other localhost access
    return response;
  }

  // If on the app domain (app.halteres.ai)
  if (isAppDomain) {
    // Check if there are auth tokens in the URL (coming from a cross-domain redirect)
    const refreshToken = req.nextUrl.searchParams.get('refresh_token');
    const accessToken = req.nextUrl.searchParams.get('access_token');

    // If we have tokens in the URL but no session, set up the session
    if (refreshToken && accessToken && !session) {
      // Create a new URL without the tokens for cleaner redirect
      const cleanUrl = new URL(req.nextUrl);
      cleanUrl.searchParams.delete('refresh_token');
      cleanUrl.searchParams.delete('access_token');

      // Create redirect response to the clean URL
      const redirectResponse = NextResponse.redirect(cleanUrl);

      // Set auth cookies on the response
      redirectResponse.cookies.set({
        name: 'sb-refresh-token',
        value: refreshToken,
        domain: '.halteres.ai',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        sameSite: 'Lax',
        secure: true,
      });

      redirectResponse.cookies.set({
        name: 'sb-access-token',
        value: accessToken,
        domain: '.halteres.ai',
        path: '/',
        maxAge: 60 * 60, // 1 hour
        sameSite: 'Lax',
        secure: true,
      });

      return redirectResponse;
    }

    // Logged out on app domain
    if (!session) {
      // Logged out on app domain? Redirect to main domain login.
      const mainLoginUrl = new URL('/login', `https://${MAIN_HOSTNAME}`);
      // Include a returnTo parameter to send the user back to the app domain after login
      mainLoginUrl.searchParams.append('returnTo', req.url);
      return NextResponse.redirect(mainLoginUrl);
    }
    // Logged in on app domain
    // If trying to access root '/' or '/login', redirect to dashboard
    if (pathname === '/' || pathname === '/login') {
      const dashboardUrl = new URL('/dashboard', req.url); // Use req.url to keep the correct base
      return NextResponse.redirect(dashboardUrl);
    }
    // Allow access to protected routes or any other path on app domain if logged in
    return response;
  }

  // If on the main domain (www.halteres.ai)
  if (isMainDomain) {
    // --- On www.halteres.ai (or your main domain) ---
    if (session) {
      // Logged in on main domain
      if (isProtectedRoute) {
        // Trying to access protected path? Redirect to app domain.
        const appUrl = new URL(pathname, `https://${APP_HOSTNAME}`);
        appUrl.search = req.nextUrl.search; // Preserve query params

        // Create the redirect response
        const redirectResponse = NextResponse.redirect(appUrl);

        // For cross-domain redirects, get refresh and access tokens from the session
        // and set them explicitly in the redirect URL
        if (session.refresh_token && session.access_token) {
          // Add auth tokens as query parameters to maintain the session across domains
          appUrl.searchParams.set('refresh_token', session.refresh_token);
          appUrl.searchParams.set('access_token', session.access_token);

          // Update the redirect URL with the tokens
          const finalRedirectResponse = NextResponse.redirect(appUrl);
          return finalRedirectResponse;
        }

        return redirectResponse;
      }
      // Allow access to public paths on main domain even if logged in
      return response;
    } else {
      // Logged out on main domain
      if (isProtectedRoute) {
        // Trying to access protected path? Redirect to main domain login.
        const loginUrl = new URL('/login', req.url); // Use req.url to keep the correct base
        return NextResponse.redirect(loginUrl);
      }
      // Allow access to public paths if logged out
      return response;
    }
  }

  // Fallback: If not localhost, not app domain, not main domain, redirect to main domain home
  const mainHomeUrl = new URL('/', `https://${MAIN_HOSTNAME}`);
  return NextResponse.redirect(mainHomeUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (your static assets folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
};
