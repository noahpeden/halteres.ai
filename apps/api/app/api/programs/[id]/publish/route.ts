import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';

// POST /api/programs/[id]/publish — owner publishes program as a template
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }
  const { error } = await supabase
    .from('programs')
    .update({ is_template: true })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  track(userId, 'program_published', { program_id: id });
  return NextResponse.json({ ok: true });
}

// DELETE /api/programs/[id]/publish — unpublish
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
    .update({ is_template: false })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
