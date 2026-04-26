import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET /api/templates — public list of published templates, sorted by forks
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get('limit') ?? 20));
  const search = url.searchParams.get('q');

  const service = createServiceClient();
  let query = service
    .from('public_templates')
    .select('*')
    .order('fork_count', { ascending: false })
    .limit(limit);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}
