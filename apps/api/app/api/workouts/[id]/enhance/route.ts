import { EnhanceWorkout } from '@halteres/core';
import { buildEnhanceMessages } from '@halteres/prompts';
import { buildRetrievalQuery, retrieveSimilar } from '@halteres/rag';
import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import { anthropic, estimateCost, SONNET } from '@/lib/anthropic';
import { authedClient } from '@/lib/auth';
import { getEntitlement, paywallResponse } from '@/lib/entitlements';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';
export const maxDuration = 300;

// POST /api/workouts/[id]/enhance — RAG-personalized enhancement.
// This is where Sonnet 4.6 runs and where retrieval fires. Streamed.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = EnhanceWorkout.safeParse({ ...body, workout_id: id });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  const entitlement = await getEntitlement(supabase, userId);
  if (!entitlement.can_enhance) {
    track(userId, 'paywall_hit', { action: 'enhance', tier: entitlement.tier });
    return paywallResponse(entitlement, 'enhance');
  }
  track(userId, 'workout_enhanced', { workout_id: id });

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
  const program = (workout as unknown as { programs: NonNullable<unknown> }).programs as {
    description: string | null;
    methodology: string | null;
    duration_weeks: number;
  };

  // RAG retrieval uses a service client to call the SECURITY DEFINER RPC.
  // The RPC pre-filters by target_user_id so cross-user leakage is impossible.
  const service = createServiceClient();
  const queryText = buildRetrievalQuery({
    description: program.description,
    methodology: program.methodology,
    skeletonBody: workout.body_skeleton,
  });
  const retrievedHistory = await retrieveSimilar(service, userId, queryText, { k: 8 }).catch(
    () => []
  );

  const { system, user } = buildEnhanceMessages({
    profile,
    program,
    workout,
    retrievedHistory,
    enhancementInput: parsed.data.enhancement_input,
  });

  await supabase
    .from('workouts')
    .update({ generation_status: 'enhancing', enhancement_input: parsed.data.enhancement_input })
    .eq('id', id);

  const client = anthropic();
  const t0 = Date.now();
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
            enhanced_at: new Date().toISOString(),
          })
          .eq('id', id);

        await supabase.from('generation_runs').insert({
          user_id: userId,
          workout_id: id,
          kind: 'enhance',
          model: SONNET,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cached_tokens: cachedTokens,
          cost_usd: estimateCost(SONNET, inputTokens, outputTokens, cachedTokens),
          duration_ms: Date.now() - t0,
        });

        send({ type: 'done' });
      } catch (err) {
        await supabase
          .from('workouts')
          .update({ generation_status: 'failed' })
          .eq('id', id);
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
