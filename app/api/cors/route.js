import { NextResponse } from 'next/server';

// This route handles OPTIONS requests (CORS preflight requests)
export async function OPTIONS() {
  // Create a response with 204 No Content status
  const response = new NextResponse(null, {
    status: 204, // No content for preflight responses
  });

  // Set CORS headers
  response.headers.set(
    'Access-Control-Allow-Origin',
    'https://www.halteres.ai, https://app.halteres.ai'
  );
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  response.headers.set('Vary', 'Origin');

  return response;
}

// For any other HTTP method, just return 200 OK with CORS headers
export async function GET() {
  const response = NextResponse.json({ ok: true });

  // Set CORS headers
  response.headers.set(
    'Access-Control-Allow-Origin',
    'https://www.halteres.ai, https://app.halteres.ai'
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Vary', 'Origin');

  return response;
}

// Make all other methods point to GET handler
export const POST = GET;
export const PUT = GET;
export const DELETE = GET;
