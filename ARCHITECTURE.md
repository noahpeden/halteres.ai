# Architecture

## Generation pipeline

```
┌───────────────┐    ┌───────────────────┐    ┌──────────────────┐
│ Create program│───▶│ Skeleton (Haiku)  │───▶│ 32 minimal       │
│ POST /programs│    │ batch, cached sys │    │ workouts written │
└───────────────┘    └───────────────────┘    └──────────────────┘

        On user click:
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ POST .../enhance │───▶│ RAG retrieve k=8 │───▶│ Sonnet 4.6 stream│
│                  │    │ (pgvector ANN)   │    │ detailed body    │
└──────────────────┘    └──────────────────┘    └──────────────────┘

        After workout:
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ POST .../log     │───▶│ Voyage-3 embed   │───▶│ pgvector upsert  │
│ rpe, exercises…  │    │ (async)          │    │ (the moat)       │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## Cost model

Per active user/month, assuming 14 enhanced workouts (typical engagement):

| Step                            | Model       | Volume          | Cost   |
| ------------------------------- | ----------- | --------------- | ------ |
| Skeleton (1 program/mo)         | Haiku 4.5   | ~6k in / 2k out | $0.015 |
| Enhance × 14                    | Sonnet 4.6  | ~3k in / 2k out | $0.21  |
| Embeddings × 14                 | Voyage-3    | ~200 tok        | $0.002 |
| **Total**                       |             |                 | **$0.23** |

Pro tier $15/mo → **65× margin**.

The free tier ("5 enhances/month") is your conversion lever: users hit the wall mid-week-2.

## Why these choices

- **Skeleton/enhance split**: Most users won't open every workout. Pay full price only for workouts actually pulled up. ~55% cost saving vs. generating everything upfront.
- **Haiku for skeleton, Sonnet for enhance**: Skeleton is structural — Haiku handles it well at ~5× cheaper. Quality matters at enhance time when the user reads it.
- **RAG only at enhance**: Skeletons don't need history; they're program-level. Enhance is workout-specific, where retrieval pays off.
- **Voyage-3 over OpenAI**: Better recall on fitness/medical terminology. Same price.
- **pgvector + HNSW**: No separate vector DB. RPC pre-filters by `user_id` before ANN — fast and prevents cross-user leakage.

## Key invariants

1. **`workouts.body_skeleton` is always populated; `body_detailed` is nullable**. Never delete a skeleton — it's the cache.
2. **`workout_logs` has at most one row per `workout_id`** (unique index). Re-logging upserts.
3. **`workout_embeddings` are written async** after log POST. UI doesn't block on it.
4. **`generation_runs` is append-only** and tracks every model call with token counts and cost.
5. **RLS scopes everything to `auth.uid()`**. The only RPC that bypasses (`match_workouts`) takes `target_user_id` and pre-filters internally.

## Things explicitly NOT in this scaffold

- The 12 methodology templates from Halteres — port them into `packages/prompts/src/methodologies/` when you need them. The current `formatClientRequirements()` and `formatStructurePriority()` make most of those templates redundant for a B2C app where users describe their own methodology.
- Web frontend (`apps/web`) and mobile (`apps/mobile`) — phases 1 and 3.
- Stripe / RevenueCat / paywall logic — phase 4.
- Anthropic Batch API integration — drop in once you confirm latency tolerance for skeleton gen (5–10 min async).
- Curated reference workout library — replaced by the user's own RAG history.

## Phase 0 checklist (what this scaffold gives you)

- [x] Monorepo (Turbo + pnpm)
- [x] Supabase schema + RLS + pgvector RPC
- [x] Shared types + zod schemas
- [x] Prompt builder (skeleton + enhance) ported from Halteres
- [x] RAG embed + retrieve
- [x] API routes: create program, enhance workout, log workout
- [x] Generation cost tracking from day one

## Phase 1 next steps

1. `pnpm install`
2. `supabase start && pnpm db:push`
3. Test the API with curl + a Supabase JWT
4. Build `apps/web` with shadcn/ui — three pages: program creation, program detail (skeleton list), workout detail (skeleton → enhance → log)
