# Halteres Pro

B2C training program app. Skeleton-first generation, RAG-personalized enhancement, day-of adaptation, native + web.

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: Next.js API routes (`apps/api`, port 3001)
- **Web**: Next.js App Router + Tailwind v4 (`apps/web`, port 3000)
- **Mobile**: Expo Router + NativeWind (`apps/mobile`)
- **Database**: Supabase (Postgres + pgvector + Auth + RLS)
- **LLM**: Anthropic Claude (Sonnet 4.6 + Haiku 4.5) with prompt caching
- **Embeddings**: Voyage-3
- **Payments**: Stripe (web) + RevenueCat (mobile stores)

## Layout

```
apps/
  api/                  Next.js API
  web/                  Next.js web app
  mobile/               Expo mobile app
packages/
  core/                 Shared zod schemas
  db/                   Supabase types + clients
  prompts/              Methodology helpers + skeleton/enhance/adapt prompts
  rag/                  Voyage embeddings + pgvector retrieval
infra/
  supabase/             SQL migrations, RLS policies
```

## Getting started

```bash
pnpm install
cp .env.example .env.local        # fill in keys
supabase start                    # local Postgres + pgvector
pnpm db:push                      # apply migrations 0001–0003
pnpm dev                          # turbo runs api + web; mobile separate

# Mobile, in another terminal:
cd apps/mobile && pnpm start
```

Open `http://localhost:3000` for web, scan the QR for Expo on a phone.

## The three operations

1. **Skeleton** (Haiku, batched at program creation, ~$0.015/program) — minimal structure for 1–8 weeks.
2. **Enhance** (Sonnet 4.6, on user click, RAG-personalized) — turns a skeleton into a fully detailed workout.
3. **Adapt** (Sonnet 4.6, on user click, RAG-personalized) — day-of modification with a constraint ("back is sore", "30 min only", "more cardio"). Preserves program intent while honoring the constraint.

All three are streamed (SSE). Logs feed back into RAG so future enhances/adapts get smarter.

See `ARCHITECTURE.md` for the cost model and design decisions.

## Phase status

| Phase | Ships | Status |
|---|---|---|
| 0 | Foundation (monorepo, schema, auth) | ✅ |
| 1 | Web MVP (skeleton + enhance + log) | ✅ |
| 2 | RAG live + admin cost dashboard | ✅ |
| 3 | Mobile (Expo) with full feature parity | ✅ |
| 4 | Stripe + RevenueCat + paywall | ✅ |
| 4.5 | Day-of adapt feature | ✅ |
| 5 | Push, history view, analytics, integrations | TBD |
