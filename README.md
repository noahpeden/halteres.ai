# Halteres Pro

B2C training program app. Skeleton-first generation, RAG-personalized enhancement, native + web.

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: Next.js API routes
- **Database**: Supabase (Postgres + pgvector + Auth + RLS)
- **LLM**: Anthropic Claude (Sonnet 4.6 + Haiku 4.5)
- **Embeddings**: Voyage-3
- **Web**: Next.js (App Router) — _phase 1_
- **Mobile**: Expo (React Native) — _phase 3_

## Layout

```
apps/
  api/                  Next.js API
packages/
  core/                 Shared types, zod schemas
  db/                   Supabase types, helpers
  prompts/              Methodology templates + helpers
  rag/                  Embedding + retrieval
infra/
  supabase/             SQL migrations, RLS policies
```

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in keys
supabase start               # local Postgres + pgvector
pnpm db:push                 # apply migrations
pnpm dev                     # run all apps
```

## Generation pipeline

1. **Skeleton** (Haiku, batch, ~$0.015/program) — runs once on program creation. Generates 1–8 weeks of minimal workout structure.
2. **Enhance** (Sonnet 4.6, streaming, RAG) — runs on user click. Pulls the user's similar past workouts via pgvector, injects performance + feedback, generates the detailed workout.
3. **Log** — user records RPE / thumbs / substitutions / actual loads. Embedding written async.

See `ARCHITECTURE.md` for the cost model and design decisions.

## Phased rollout

| Phase | Weeks | Ships |
|-------|-------|-------|
| 0 | 1–2  | Foundation (this scaffold) |
| 1 | 3–6  | MVP web: skeleton + enhance + logging |
| 2 | 7–9  | RAG live, cost dashboard |
| 3 | 10–11| Mobile (Expo) |
| 4 | 12   | Stripe + RevenueCat, free/Pro tiers |
