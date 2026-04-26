import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET /api/integrations/strava/callback?code=…&state=<user_id>
// Exchanges the code, stores tokens, redirects back to web /settings.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const userId = url.searchParams.get('state');
  if (!code || !userId) {
    return NextResponse.json({ error: 'missing code/state' }, { status: 400 });
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.json({ error: await tokenRes.text() }, { status: 502 });
  }
  const json = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete?: { id: number };
    scope?: string;
  };

  const service = createServiceClient();
  await service.from('integrations').upsert({
    user_id: userId,
    provider: 'strava',
    external_id: json.athlete?.id?.toString() ?? null,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: new Date(json.expires_at * 1000).toISOString(),
    scope: json.scope ?? 'read,activity:read',
  });

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? '';
  return NextResponse.redirect(`${webUrl}/account?strava=connected`);
}
