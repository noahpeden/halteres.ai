import { createServiceClient } from '@halteres/db/server';
import { buildAdaptMessages } from '@halteres/prompts';
import { buildRetrievalQuery, retrieveSimilar } from '@halteres/rag';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { anthropic, estimateCost, SONNET } from '@/lib/anthropic';
import { authedClient } from '@/lib/auth';
import { getEntitlement, paywallResponse } from '@/lib/entitlements';

export const runtime = 'nodejs';
export const maxDuration = 300;

const AdaptInput = z.object({
  constraint: z.string().min(3).max(1000),
});

// POST /api/workouts/[id]/adapt — day-of modification of an existing workout.
// Counts toward the user's monthly enhance quota (same Sonnet call cost).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = AdaptInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  const entitlement = await getEntitlement(supabase, userId);
  if (!entitlement.can_enhance) {
    return paywallResponse(entitlement, 'enhance');
  }

  const [{ data: workout }, { data: profile }] = await Promise.all([
    supabase
      .from('workouts')
      .select('*, programs(description, methodology, duration_weeks)')
      .eq('id', id)
      .single(),
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
  ]);
  if (!workout || !profile) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const program = (workout as unknown as { programs: unknown }).programs as {
    description: string | null;
    methodology: string | null;
    duration_weeks: number;
  };

  const service = createServiceClient();
  const queryText = buildRetrievalQuery({
    description: program.description,
    methodology: program.methodology,
    weekIntent: parsed.data.constraint,
    skeletonBody: workout.body_skeleton,
  });
  const retrievedHistory = await retrieveSimilar(service, userId, queryText, { k: 6 }).catch(
    () => []
  );

  const { system, user } = buildAdaptMessages({
    profile,
    program,
    workout,
    constraint: parsed.data.constraint,
    retrievedHistory,
  });

  const t0 = Date.now();
  const client = anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        const resp = await client.messages.create({
          model: SONNET,
          max_tokens: 4000,
          temperature: 0.7,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: user }],
          stream: true,
        });

        let body = '';
        let inputTokens = 0;
        let outputTokens = 0;
        let cachedTokens = 0;

        for await (const ev of resp) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            body += ev.delta.text;
            send({ type: 'chunk', text: ev.delta.text });
          } else if (ev.type === 'message_start') {
            inputTokens = ev.message.usage.input_tokens;
            cachedTokens = ev.message.usage.cache_read_input_tokens ?? 0;
          } else if (ev.type === 'message_delta') {
            outputTokens = ev.usage.output_tokens;
          }
        }

        await supabase
          .from('workouts')
          .update({
            body_detailed: body,
            generation_status: 'detailed',
            enhancement_input: parsed.data.constraint,
            enhanced_at: new Date().toISOString(),
          })
          .eq('id', id);

        await supabase.from('generation_runs').insert({
          user_id: userId,
          workout_id: id,
          kind: 'enhance', // counts toward the same monthly quota
          model: SONNET,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cached_tokens: cachedTokens,
          cost_usd: estimateCost(SONNET, inputTokens, outputTokens, cachedTokens),
          duration_ms: Date.now() - t0,
        });

        send({ type: 'done' });
      } catch (err) {
        send({ type: 'error', message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
