import { NextResponse } from 'next/server';
import { emails } from '@/lib/email';

export const runtime = 'nodejs';

// POST /api/webhooks/supabase
// Configured as a Database Webhook in Supabase: trigger on INSERT into
// auth.users, with header `x-webhook-secret: $SUPABASE_WEBHOOK_SECRET`.
// Sends the welcome email.
export async function POST(req: Request) {
  const secret = req.headers.get('x-webhook-secret');
  if (!process.env.SUPABASE_WEBHOOK_SECRET || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = (await req.json()) as {
    type?: 'INSERT' | 'UPDATE' | 'DELETE';
    table?: string;
    record?: { email?: string };
  };
  if (payload.type !== 'INSERT' || payload.table !== 'users') {
    return NextResponse.json({ ignored: true });
  }
  const email = payload.record?.email;
  if (email) emails.welcome(email).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
