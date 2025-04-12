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
        domain: '.halteres.ai',
        path: '/',
        sameSite: 'Lax', // Explicitly set SameSite
        secure: true, // Explicitly set Secure
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
      console.log(
        'LOCALHOST: Redirecting protected path to login:',
        url.toString()
      );
      return NextResponse.redirect(url);
    }
    if (pathname === '/login' && session) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      console.log(
        'LOCALHOST: Redirecting logged in user from login to dashboard:',
        url.toString()
      );
      return NextResponse.redirect(url);
    }
    // Allow all other localhost access
    return response;
  }

  // If on the app domain (app.halteres.ai)
  if (isAppDomain) {
    // --- On app.halteres.ai ---
    if (!session) {
      // Logged out on app domain? Redirect to main domain login.
      const mainLoginUrl = new URL('/login', `https://${MAIN_HOSTNAME}`);
      console.log(
        'APP DOMAIN (Logged Out): Redirecting to main login:',
        mainLoginUrl.toString()
      );
      return NextResponse.redirect(mainLoginUrl);
    }
    // Logged in on app domain
    // If trying to access root '/' or '/login', redirect to dashboard
    if (pathname === '/' || pathname === '/login') {
      const dashboardUrl = new URL('/dashboard', req.url); // Use req.url to keep the correct base
      console.log(
        'APP DOMAIN (Logged In): Redirecting / or /login to dashboard:',
        dashboardUrl.toString()
      );
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
        console.log(
          'MAIN DOMAIN (Logged In): Redirecting protected path to app domain:',
          appUrl.toString()
        );
        return NextResponse.redirect(appUrl);
      }
      // Allow access to public paths on main domain even if logged in
      return response;
    } else {
      // Logged out on main domain
      if (isProtectedRoute) {
        // Trying to access protected path? Redirect to main domain login.
        const loginUrl = new URL('/login', req.url); // Use req.url to keep the correct base
        console.log(
          'MAIN DOMAIN (Logged Out): Redirecting protected path to login:',
          loginUrl.toString()
        );
        return NextResponse.redirect(loginUrl);
      }
      // Allow access to public paths if logged out
      return response;
    }
  }

  // Fallback: If not localhost, not app domain, not main domain, redirect to main domain home
  console.log(`Unknown hostname "${hostname}", redirecting to main domain.`);
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
