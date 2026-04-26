# Architecture

## Generation pipeline

```
┌───────────────┐    ┌───────────────────┐    ┌──────────────────┐
│ Create program│───▶│ Skeleton (Haiku)  │───▶│ Minimal workouts │
│ POST /programs│    │ cached system     │    │ saved per week   │
└───────────────┘    └───────────────────┘    └──────────────────┘

   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ POST .../enhance │───▶│ RAG retrieve k=8 │───▶│ Sonnet 4.6 stream│
   │ skeleton→detailed│    │ (pgvector ANN)   │    │ detailed body    │
   └──────────────────┘    └──────────────────┘    └──────────────────┘

   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ POST .../adapt   │───▶│ RAG retrieve k=6 │───▶│ Sonnet 4.6 stream│
   │ day-of constraint│    │ + program intent │    │ adapted body     │
   └──────────────────┘    └──────────────────┘    └──────────────────┘

   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ POST .../log     │───▶│ Voyage-3 embed   │───▶│ pgvector upsert  │
│ rpe, exercises…  │    │ (async)          │    │ (the moat)       │
   └──────────────────┘    └──────────────────┘    └──────────────────┘
```

## Three workout operations, one storage model

| Operation | When | Cost | Replaces |
|---|---|---|---|
| **Skeleton** | Once at program creation | $0.015 (Haiku) | nothing — initial |
| **Enhance** | First time user opens a workout | $0.015 (Sonnet, RAG, cached) | populates `body_detailed` |
| **Adapt** | Day-of, when constraint changes | $0.015 (Sonnet, RAG, cached) | overwrites `body_detailed`, stores constraint |
| **Log** | After workout completes | $0.0001 (Voyage embed) | populates `workout_logs` + `workout_embeddings` |

Skeleton is always preserved. Enhance and adapt both write to `body_detailed` with `enhancement_input` recording what the user asked for. Both count toward the monthly enhance quota for entitlements.

## Cost model

Per active user/month, assuming 14 enhanced workouts (typical engagement):

| Step | Model | Volume | Cost |
| --- | --- | --- | --- |
| Skeleton (1 program/mo) | Haiku 4.5 | ~6k in / 2k out | $0.015 |
| Enhance × 14 | Sonnet 4.6 | ~3k in / 2k out | $0.21 |
| Embeddings × 14 | Voyage-3 | ~200 tok | $0.002 |
| **Total** | | | **$0.23** |

Pro tier $15/mo → **65× margin**.

Free tier ("5 enhances/month + 1 program/month") is the conversion lever. Hits the wall mid-week-2.

## Entitlements

`subscriptions` is the source of truth, with two upstreams:
- **Stripe** for web subscribers (`source = 'stripe'`)
- **RevenueCat** for App Store / Play Store (`source = 'revenuecat'`)

The `entitlement_status` view joins `subscriptions` with month-to-date usage from `generation_runs` and `programs`. The API gates `/programs` and `/workouts/:id/{enhance,adapt}` on `getEntitlement()`. A `402 Paywall` response carries the current entitlement so the client can deep-link to `/billing`.

## Why these choices

- **Skeleton/enhance split**: Most users won't open every workout. ~55% cost savings vs. generating everything upfront.
- **Adapt as a first-class operation**: Day-of changes are the single most common athlete need. The prompt explicitly preserves program intent while honoring the constraint, and pulls RAG history so it remembers what worked.
- **Haiku for skeleton, Sonnet for enhance/adapt**: Skeleton is structural — Haiku at ~5× cheaper. Quality matters at the moment the user reads the workout.
- **RAG only at enhance/adapt time**: Skeletons don't need history; they're program-level. Workout-specific generation is where retrieval pays off.
- **Voyage-3 over OpenAI**: Better recall on fitness terminology. Same price.
- **pgvector + HNSW**: No separate vector DB. RPC pre-filters by `user_id` before ANN — fast and prevents cross-user leakage.
- **Stripe + RevenueCat**: Web and mobile have different store rules. Both write to one `subscriptions` table.

## Key invariants

1. `workouts.body_skeleton` is always populated; `body_detailed` is nullable. Never delete a skeleton — it's the baseline for adapts.
2. `workout_logs` has at most one row per `workout_id`. Re-logging upserts.
3. `workout_embeddings` are written async after log POST.
4. `generation_runs` is append-only, tracks every model call with token counts and cost. The `entitlement_status` view reads from it for free-tier metering.
5. RLS scopes everything to `auth.uid()`. The `match_workouts` RPC takes `target_user_id` and pre-filters before ANN.
6. `subscriptions` is auto-provisioned on signup via `provision_free_subscription` trigger.

## Apps in the monorepo

```
apps/api    Next.js API routes (port 3001 in dev)
apps/web    Next.js + Tailwind v4 (port 3000 in dev)
apps/mobile Expo Router + NativeWind
```

The web and mobile apps both:
1. Authenticate via Supabase (cookies on web, AsyncStorage on mobile)
2. Send Bearer tokens to the API app
3. Stream SSE responses for skeleton / enhance / adapt
4. Subscribe to the same Supabase tables via RLS for read paths (program lists, workout details, logs)

## Phase status

- [x] **Phase 0** — Foundation: monorepo, Supabase schema, auth, RLS
- [x] **Phase 1** — Web MVP: skeleton + enhance + log
- [x] **Phase 2** — RAG live + cost dashboard
- [x] **Phase 3** — Mobile (Expo) with auth + programs + enhance + adapt + log
- [x] **Phase 4** — Stripe + RevenueCat + paywall gating
- [x] **Phase 4.5** — Adapt feature (day-of workout modification)

## Phase 5 candidates (next)

- Push notifications via Expo Notifications (workout reminders)
- Workout history view on mobile (calendar)
- Program completion analytics (consistency, RPE trend, PR tracking)
- Social: share a program (read-only link)
- Apple Health / Strava sync (auto-populate exercises array on log)
- Anthropic Batch API for skeleton generation (50% discount, 5–10 min latency OK at signup)
