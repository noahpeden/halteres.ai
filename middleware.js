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
const MAIN_HOSTNAME = 'www.halteres.ai';

export async function middleware(req) {
  // Handle OPTIONS requests (preflight) properly with CORS headers
  if (req.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set(
      'Access-Control-Allow-Origin',
      `https://${MAIN_HOSTNAME}`
    );
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Vary', 'Origin');
    return response;
  }

  // Create response object
  let response = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // Add CORS headers to all responses
  response.headers.set(
    'Access-Control-Allow-Origin',
    `https://${MAIN_HOSTNAME}, https://${APP_HOSTNAME}`
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Vary', 'Origin');

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

  // Check if this is a Next.js prefetch request
  const isNextJsPrefetch =
    req.headers.get('purpose') === 'prefetch' ||
    req.headers.get('sec-fetch-mode') === 'cors' ||
    req.headers.get('x-middleware-prefetch') === '1' ||
    req.url.includes('_rsc=');

  // If this is localhost, pass through all requests
  if (isLocalhost) {
    return response;
  }

  // Initialize Supabase client just for checking session status
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return readCookie(req, name);
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
      cookieOptions: {
        domain: '.halteres.ai', // Share cookies across all subdomains
        path: '/',
        sameSite: 'Lax',
        secure: true,
      },
    }
  );

  // Check session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Skip cross-domain redirects for Next.js prefetches to avoid CORS issues
  if (isNextJsPrefetch) {
    return response;
  }

  // If on the app domain (app.halteres.ai)
  if (isAppDomain) {
    // If dashboard or program path but no session, redirect to login
    if (
      (pathname.startsWith('/dashboard') || pathname.startsWith('/program')) &&
      !session
    ) {
      return NextResponse.redirect(
        `https://${MAIN_HOSTNAME}/login?returnTo=${encodeURIComponent(req.url)}`
      );
    }

    // For home path, redirect to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Allow all other paths
    return response;
  }

  // If on the main domain (www.halteres.ai)
  if (isMainDomain) {
    // If user has a session and trying to access dashboard or program path
    if (
      session &&
      (pathname.startsWith('/dashboard') || pathname.startsWith('/program'))
    ) {
      // For page loads (not prefetch), redirect to app domain
      const appUrl = new URL(req.url);
      appUrl.hostname = APP_HOSTNAME;

      // Create a redirect response with CORS headers
      const redirectResponse = NextResponse.redirect(appUrl);
      redirectResponse.headers.set(
        'Access-Control-Allow-Origin',
        `https://${MAIN_HOSTNAME}`
      );
      redirectResponse.headers.set('Access-Control-Allow-Credentials', 'true');

      return redirectResponse;
    }

    // Allow all other paths
    return response;
  }

  // Unknown domain - redirect to main site
  return NextResponse.redirect(`https://${MAIN_HOSTNAME}/`);
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
