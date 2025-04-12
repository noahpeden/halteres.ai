import { NextResponse } from 'next/server';

// --- Configuration ---
// Replace with your actual domains
const APP_HOSTNAME = 'app.halteres.ai';
const MAIN_HOSTNAME = 'www.halteres.ai';

export async function middleware(req) {
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

  // --- Domain Handling ---

  // If on localhost, no redirects
  if (isLocalhost) {
    return NextResponse.next();
  }

  // If on the app domain (app.halteres.ai)
  if (isAppDomain) {
    // If trying to access root '/' or '/login', redirect to dashboard
    if (pathname === '/') {
      const dashboardUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(dashboardUrl);
    }
    // Allow access to all other paths on app domain
    return NextResponse.next();
  }

  // If on the main domain (www.halteres.ai)
  if (isMainDomain) {
    return NextResponse.next();
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
