# JavaScript to TypeScript Migration TODO

This document tracks the progress of migrating the Next.js application from JavaScript to TypeScript.

## Setup

- [x] Create `tsconfig.json`
- [x] Create `app/types.ts` for global types
- [x] Install necessary TypeScript dependencies (`typescript`, `@types/node`, `@types/react`, `@types/react-dom`)

## Core App Files

- [x] Convert `app/layout.js` to `app/layout.tsx`
- [x] Convert `app/page.js` to `app/page.tsx`
- [x] Convert `app/metadata.js` to `app/metadata.ts`
- [x] Convert `app/simple-metadata.js` to `app/simple-metadata.ts`
- [x] Convert `app/manifest.js` to `app/manifest.ts`
- [x] Convert `app/icon.js` to `app/icon.tsx`
- [x] Convert `app/apple-icon.js` to `app/apple-icon.tsx`
- [x] Convert `app/opengraph-image.js` to `app/opengraph-image.tsx`
- [x] Convert `app/sitemap.js` to `app/sitemap.ts`
- [x] Convert `app/robots.js` to `app/robots.ts`
- [x] Convert `app/client-providers.js` to `app/client-providers.tsx`
- [x] Convert `app/font.js` to `app/font.ts`

## Components

- [ ] Convert files in `app/components` directory (List specific files as needed)
  - [ ] `ProgramCalendar.jsx` -> `ProgramCalendar.tsx`
  - [ ] `ClientMetricsTab.jsx` -> `ClientMetricsTab.tsx`
  - [ ] `UpcomingWorkouts.jsx` -> `UpcomingWorkouts.tsx`
  - [ ] `Navbar.js` -> `Navbar.tsx`
  - [ ] `AIWorkoutReferencer.jsx` -> `AIWorkoutReferencer.tsx`
  - [ ] `TodayWorkouts.jsx` -> `TodayWorkouts.tsx`
  - [ ] `Toast.jsx` -> `Toast.tsx`
  - [ ] `AIWorkoutSuggestions.jsx` -> `AIWorkoutSuggestions.tsx`
  - [ ] `PeriodizationView.jsx` -> `PeriodizationView.tsx`
  - [ ] `WorkoutSelection.jsx` -> `WorkoutSelection.tsx`
  - [x] `utils.js` -> `utils.ts`
  - [ ] `ClientMetricsSidebar.jsx` -> `ClientMetricsSidebar.tsx`
  - [ ] Convert files in `app/components/AIProgramWriter`
  - [ ] Convert files in `app/components/home`

## Routes & API

- [ ] Convert files in `app/api` directory
- [ ] Convert files in `app/actions` directory
- [ ] Convert page/layout files in route directories (`dashboard`, `updates`, `_team`, `help`, `company`, `contact`, `features`, `pricing`, `_blog`, `support`, `program`, `programs`, `write-program`, `login`, `auth`, `error`, `[...not_found]`)

## Utilities, Stores, Contexts, Hooks

- [ ] Convert files in `app/utils` directory
- [ ] Convert files in `app/stores` directory
- [ ] Convert files in `app/contexts` directory
- [ ] Convert files in `app/hooks` directory

## Dependencies & Configuration

- [ ] Update `package.json` (scripts, dependencies)
- [ ] Configure ESLint for TypeScript
- [ ] Configure Prettier for TypeScript

## Testing & Refinement

- [ ] Run `tsc --noEmit` to check for type errors
- [ ] Address any type errors or warnings
- [ ] Test application functionality thoroughly
- [ ] Refactor code for better type safety and patterns

---

_We will mark items as completed as we progress._
