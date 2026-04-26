import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';

export const runtime = 'nodejs';

// DELETE /api/notes/[id] — coach removes their own note
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let supabase;
  try {
    ({ supabase } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }
  const { error } = await supabase.from('coach_notes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
