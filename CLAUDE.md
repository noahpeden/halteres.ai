# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Cross-Platform Parity Rule

**Any feature, component, or functionality added to this web app MUST also be implemented in the mobile app (halteres-mobile), and vice versa.**

This includes:
- New screens/pages
- New components
- API integrations and hooks
- Database schema changes
- Form fields and validation
- Business logic

When making changes, always check both codebases and ensure feature parity. The mobile app is located at `../halteres-mobile/`.

## Development Commands

### Core Commands
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run Biome linter with auto-fix (use this for linting)
- `npm run lint:check` - Run Biome linter without auto-fix (check only)
- `npm run format` - Format code with Biome

### Linting Note
This project uses **Biome** for linting instead of ESLint. Biome is faster, has no Node.js version requirements, and works reliably across all environments. The ESLint packages remain installed for Next.js compatibility but are not used directly.

### Supabase Commands
- `npx supabase db push` - Push database migrations
- `npx supabase gen types typescript` - Generate TypeScript types from database schema

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **UI**: React with DaisyUI (Tailwind CSS component library)
- **Styling**: Tailwind CSS
- **Backend**: Supabase for authentication and database
- **AI**: OpenAI API for program generation
- **State Management**: React hooks and context

### Project Structure
- `/app` - Next.js App Router pages and layouts
  - `/actions` - Server actions for data mutations
  - `/api` - API routes
  - `/components` - Page-specific components
  - `/dashboard` - Dashboard pages
  - `/utils` - Utility functions including prompt builder
- `/components` - Shared React components
- `/supabase` - Supabase configuration and migrations
- `/public` - Static assets

### Key Files
- `app/utils/prompt-builder/promptBuilder.js` - AI prompt generation for workouts
- `app/actions/entityActions.js` - CRUD operations for clients/classes
- `app/components/CreateEditEntityModal.jsx` - Modal for creating/editing entities

## Environment Variables

Required environment variables (create `.env.local` file):
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

## Database Schema

The `entities` table supports both CLIENT and CLASS types with the following columns:
- Core: `id`, `name`, `type`, `user_id`, `created_at`, `updated_at`
- Client metrics: `bench_1rm`, `squat_1rm`, `deadlift_1rm`, `weight_kg`, `height_cm`, `mile_time`, `gender`, `recovery_score`, `injury_history`
- Class metrics: `class_size`, `average_age`, `has_elite_athletes`, `average_experience_years`, `skill_distribution`, `class_duration_minutes`, `warmup_duration_minutes`
