import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/integrations/strava/connect — returns the Strava OAuth URL.
// The client redirects to it; Strava redirects back to /callback with a code.
export async function GET(req: Request) {
  let userId;
  try {
    ({ userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  if (!clientId || !apiUrl) {
    return NextResponse.json({ error: 'strava not configured' }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${apiUrl}/api/integrations/strava/callback`,
    response_type: 'code',
    scope: 'read,activity:read',
    approval_prompt: 'auto',
    state: userId, // round-trip the user id (signed-token would be safer in prod)
  });

  return NextResponse.json({
    url: `https://www.strava.com/oauth/authorize?${params.toString()}`,
  });
}
