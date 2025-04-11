import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

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
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;
  let hostname = req.headers.get('host'); // Get hostname from headers

  // Handle potential port in development (e.g., localhost:3000)
  if (hostname.includes(':')) {
    hostname = hostname.split(':')[0];
  }

  // Use 'localhost' for development checks
  const currentAppHost =
    process.env.NODE_ENV === 'development' ? 'localhost' : APP_HOSTNAME;
  const currentMainHost =
    process.env.NODE_ENV === 'development' ? 'localhost' : MAIN_HOSTNAME;

  const isAppDomain = hostname === currentAppHost;
  const isMainDomain = hostname === currentMainHost;
  const isProtectedRoute = PROTECTED_PATHS_PREFIX.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // --- Development Environment Logic ---
  if (process.env.NODE_ENV === 'development' && hostname === 'localhost') {
    // Basic protection for localhost development
    if (isProtectedRoute && !session) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      console.log('DEV: Redirecting to login:', url.toString());
      return NextResponse.redirect(url);
    }
    if (pathname === '/login' && session) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      console.log(
        'DEV: Redirecting logged in user from login to dashboard:',
        url.toString()
      );
      return NextResponse.redirect(url);
    }
    // Allow access to everything else on localhost
    return res;
  }

  // --- Production Environment Logic ---

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
      const dashboardUrl = new URL('/dashboard', req.url);
      console.log(
        'APP DOMAIN (Logged In): Redirecting / or /login to dashboard:',
        dashboardUrl.toString()
      );
      return NextResponse.redirect(dashboardUrl);
    }
    // Allow access to protected routes or any other path on app domain if logged in
    return res;
  } else if (isMainDomain) {
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
      return res;
    } else {
      // Logged out on main domain
      if (isProtectedRoute) {
        // Trying to access protected path? Redirect to main domain login.
        const loginUrl = new URL('/login', req.url);
        console.log(
          'MAIN DOMAIN (Logged Out): Redirecting protected path to login:',
          loginUrl.toString()
        );
        return NextResponse.redirect(loginUrl);
      }
      // Allow access to public paths if logged out
      return res;
    }
  } else {
    // --- Neither App nor Main Domain ---
    // Redirect any other hostname to the main domain homepage
    console.log(`Unknown hostname "${hostname}", redirecting to main domain.`);
    const mainHomeUrl = new URL('/', `https://${MAIN_HOSTNAME}`);
    return NextResponse.redirect(mainHomeUrl);
  }
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
