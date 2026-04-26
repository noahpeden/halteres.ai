import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { authedClient } from '@/lib/auth';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';

// POST /api/programs/[id]/share — generates (or returns existing) share token
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from('programs')
    .select('share_token')
    .eq('id', id)
    .single();
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (existing.share_token) {
    return NextResponse.json({ share_token: existing.share_token });
  }

  const token = randomBytes(16).toString('base64url');
  const { error } = await supabase
    .from('programs')
    .update({ share_token: token })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  track(userId, 'program_shared', { program_id: id });
  return NextResponse.json({ share_token: token });
}

// DELETE /api/programs/[id]/share — revokes the share link
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let supabase;
  try {
    ({ supabase } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const { error } = await supabase
    .from('programs')
    .update({ share_token: null })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
