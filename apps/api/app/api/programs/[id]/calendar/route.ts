import { authedClient } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/programs/[id]/calendar — returns an .ics feed users can subscribe
// to in Apple Calendar / Google Calendar / Outlook. Auth via Bearer; calendar
// apps that don't support headers can use ?token=<jwt> query param.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken && !req.headers.get('authorization')) {
    const r = new Request(req, {
      headers: new Headers([
        ...Array.from(req.headers.entries()),
        ['authorization', `Bearer ${queryToken}`],
      ]),
    });
    return GET(r, ctx);
  }

  const { id } = await ctx.params;
  let supabase;
  try {
    ({ supabase } = await authedClient(req));
  } catch (e) {
    return e instanceof Response
      ? e
      : new Response('unauthorized', { status: 401 });
  }

  const { data: program } = await supabase
    .from('programs')
    .select('id, title, days_per_week')
    .eq('id', id)
    .single();
  if (!program) return new Response('not found', { status: 404 });

  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, title, scheduled_date, body_skeleton, body_detailed')
    .eq('program_id', id)
    .order('scheduled_date');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Halteres//Program//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(program.title)}`,
    'METHOD:PUBLISH',
  ];

  for (const w of workouts ?? []) {
    const date = w.scheduled_date.replace(/-/g, '');
    const body = (w.body_detailed ?? w.body_skeleton ?? '').slice(0, 800);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${w.id}@halteres.ai`,
      `DTSTAMP:${nowIcs()}`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${date}`,
      `SUMMARY:${escapeText(w.title)}`,
      `DESCRIPTION:${escapeText(body)}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${program.id}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function nowIcs(): string {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
