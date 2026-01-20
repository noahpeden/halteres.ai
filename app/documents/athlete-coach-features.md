# Athlete & Coach Features Documentation

## Overview

This document provides comprehensive documentation for the athlete engagement and coach management features in Halteres. These features transform the platform from a coach-only program creation tool into a full gym management system with athlete engagement, workout logging, leaderboards, and AI-powered feedback.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Row Level Security (RLS) Policies](#row-level-security-policies)
4. [API Routes](#api-routes)
5. [Server Actions](#server-actions)
6. [Athlete Features](#athlete-features)
7. [Coach Features](#coach-features)
8. [AI Feedback System](#ai-feedback-system)
9. [Components Reference](#components-reference)
10. [User Flows](#user-flows)
11. [Testing Guide](#testing-guide)

---

## Architecture Overview

### Core Concepts

```
┌─────────────────────────────────────────────────────────────────┐
│                            GYM                                   │
│  (Organization owned by a coach, athletes join via invite)      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    COACH     │    │   ATHLETES   │    │   PROGRAMS   │      │
│  │  (owner)     │    │  (members)   │    │  (gym_id)    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         │                   │                   ▼                │
│         │                   │           ┌──────────────┐        │
│         │                   │           │   WORKOUTS   │        │
│         │                   │           │  (gym_id)    │        │
│         │                   │           └──────────────┘        │
│         │                   │                   │                │
│         │                   ▼                   ▼                │
│         │           ┌──────────────────────────────┐            │
│         │           │      WORKOUT RESULTS         │            │
│         │           │  (user_id, workout_id)       │            │
│         │           └──────────────────────────────┘            │
│         │                        │                               │
│         │                        ▼                               │
│         │           ┌──────────────────────────────┐            │
│         │           │   LEADERBOARDS + SOCIAL      │            │
│         │           │   (fist bumps, comments)     │            │
│         │           └──────────────────────────────┘            │
│         │                        │                               │
│         ▼                        ▼                               │
│  ┌──────────────────────────────────────────────────┐           │
│  │              AI FEEDBACK + PR TRACKING           │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Relationships

1. **Gym** → Owned by a coach (user with owner role)
2. **Athletes** → Join gyms via invite code, become members
3. **Programs** → Created by coaches, linked to gym via `gym_id`
4. **Workouts** → Belong to programs, inherit `gym_id`
5. **Results** → Athletes log results for workouts
6. **Leaderboards** → Aggregated from workout results within a gym
7. **AI Feedback** → Generated per workout result using Claude Haiku 4.5

---

## Database Schema

### Tables Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `gyms` | Organizations/gyms | `id`, `owner_id`, `name`, `invite_code` |
| `gym_memberships` | User-gym relationships | `gym_id`, `user_id`, `role`, `status` |
| `programs` | Training programs | `id`, `gym_id`, `entity_id`, `name`, `calendar_data` |
| `program_workouts` | Individual workouts | `id`, `program_id`, `gym_id`, `title`, `body`, `scheduled_date` |
| `workout_results` | Athlete results | `id`, `user_id`, `workout_id`, `result_type`, `scale` |
| `personal_records` | PR tracking | `id`, `user_id`, `category`, `result_type` |
| `social_interactions` | Fist bumps & comments | `id`, `user_id`, `workout_result_id`, `interaction_type` |
| `ai_workout_feedback` | AI-generated feedback | `id`, `user_id`, `workout_result_id`, `performance_analysis` |

### Detailed Schema

#### `gyms` Table
```sql
CREATE TABLE public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  logo_url text,
  timezone text DEFAULT 'America/New_York',
  invite_code text UNIQUE,
  invite_code_expires_at timestamptz,
  require_approval boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

#### `gym_memberships` Table
```sql
CREATE TYPE gym_membership_role AS ENUM ('owner', 'coach', 'athlete');
CREATE TYPE gym_membership_status AS ENUM ('pending', 'active', 'suspended', 'left');

CREATE TABLE public.gym_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role gym_membership_role DEFAULT 'athlete',
  status gym_membership_status DEFAULT 'pending',
  joined_at timestamptz,
  nickname text,
  class_id uuid REFERENCES public.entities(id),
  UNIQUE(gym_id, user_id)
);
```

#### `workout_results` Table
```sql
CREATE TYPE result_scale AS ENUM ('rx', 'scaled', 'rx_plus');
CREATE TYPE result_type AS ENUM ('time', 'rounds_reps', 'weight', 'reps', 'distance', 'calories');

CREATE TABLE public.workout_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  workout_id uuid NOT NULL REFERENCES public.program_workouts(id),
  gym_id uuid REFERENCES public.gyms(id),
  result_type result_type NOT NULL,
  time_seconds integer,          -- For TIME results
  rounds integer,                -- For AMRAP
  reps integer,                  -- For AMRAP or rep-based
  weight_kg numeric,             -- For weight-based
  count integer,                 -- For reps/distance/calories
  scale result_scale DEFAULT 'rx',
  modifications text,
  notes text,
  photos jsonb DEFAULT '[]',
  perceived_effort integer CHECK (perceived_effort >= 1 AND perceived_effort <= 10),
  include_in_leaderboard boolean DEFAULT true,
  is_pr boolean DEFAULT false,
  pr_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

#### `personal_records` Table
```sql
CREATE TABLE public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  category text NOT NULL,        -- 'workout', 'back_squat', 'fran', etc.
  custom_name text,
  result_type result_type NOT NULL,
  time_seconds integer,
  weight_kg numeric,
  reps integer,
  rounds integer,
  scale result_scale DEFAULT 'rx',
  achieved_at timestamptz DEFAULT now(),
  workout_result_id uuid REFERENCES public.workout_results(id),
  previous_value numeric,
  improvement_percentage numeric
);
```

#### `social_interactions` Table
```sql
CREATE TYPE interaction_type AS ENUM ('fist_bump', 'comment');

CREATE TABLE public.social_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  workout_result_id uuid REFERENCES public.workout_results(id),
  parent_comment_id uuid REFERENCES public.social_interactions(id),
  interaction_type interaction_type NOT NULL,
  content text,                  -- For comments
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

#### `ai_workout_feedback` Table
```sql
CREATE TABLE public.ai_workout_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  workout_result_id uuid REFERENCES public.workout_results(id),
  performance_analysis text,
  strengths jsonb DEFAULT '[]',
  areas_for_improvement jsonb DEFAULT '[]',
  recovery_suggestions jsonb DEFAULT '[]',
  next_workout_recommendations jsonb DEFAULT '[]',
  model_used text,
  created_at timestamptz DEFAULT now()
);
```

### Profile Extensions
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  role text DEFAULT 'coach' CHECK (role IN ('coach', 'athlete')),
  display_name text,
  profile_photo_url text,
  bench_1rm numeric,
  squat_1rm numeric,
  deadlift_1rm numeric,
  weight_kg numeric,
  height_cm numeric,
  mile_time text,
  gender text,
  recovery_score integer,
  injury_history text,
  notification_preferences jsonb DEFAULT '{"new_workout": true, "pr_achieved": true}';
```

---

## Row Level Security Policies

### Workout Results Policies

```sql
-- Users can manage their own results
CREATE POLICY "Users can manage own results"
ON public.workout_results
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Gym members can view other members' results (for leaderboards)
CREATE POLICY "Gym members can view gym results"
ON public.workout_results
FOR SELECT TO authenticated
USING (
    gym_id IN (
        SELECT gym_id FROM public.gym_memberships
        WHERE user_id = auth.uid() AND status = 'active'
    )
    AND include_in_leaderboard = true
    AND deleted_at IS NULL
);

-- Coaches can view all results in their gym
CREATE POLICY "Coaches can view all gym results"
ON public.workout_results
FOR SELECT TO authenticated
USING (
    gym_id IN (
        SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
);
```

### Program Policies

```sql
-- Gym members can view programs at their gym
CREATE POLICY "Gym members can view gym programs"
ON public.programs
FOR SELECT TO authenticated
USING (
    gym_id IS NOT NULL AND
    gym_id IN (
        SELECT gym_id FROM public.gym_memberships
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

-- Gym owners can view all programs in their gyms
CREATE POLICY "Gym owners can view all gym programs"
ON public.programs
FOR SELECT TO authenticated
USING (
    gym_id IS NOT NULL AND
    gym_id IN (
        SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
);
```

### Workout Policies

```sql
-- Gym members can view workouts at their gym
CREATE POLICY "Gym members can view gym workouts"
ON public.program_workouts
FOR SELECT TO authenticated
USING (
    gym_id IS NOT NULL AND
    gym_id IN (
        SELECT gym_id FROM public.gym_memberships
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

-- Gym owners can view all workouts in their gyms
CREATE POLICY "Gym owners can view all gym workouts"
ON public.program_workouts
FOR SELECT TO authenticated
USING (
    gym_id IS NOT NULL AND
    gym_id IN (
        SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
);
```

### Table Grants

```sql
-- Required for authenticated users to access tables
GRANT ALL ON public.workout_results TO authenticated;
GRANT ALL ON public.personal_records TO authenticated;
GRANT ALL ON public.social_interactions TO authenticated;
GRANT ALL ON public.ai_workout_feedback TO authenticated;
```

---

## API Routes

### Athlete Routes

#### `GET /api/athlete/today`
Fetches today's workouts for a gym.

**Query Parameters:**
- `gymId` (required): The gym ID
- `date` (required): Date in YYYY-MM-DD format

**Response:**
```json
{
  "success": true,
  "workouts": [
    {
      "id": "uuid",
      "title": "Week 1, Day 3: Olympic Lifting",
      "workout_type": "For Time",
      "body": "...",
      "scheduled_date": "2026-01-14T00:00:00Z",
      "hasLogged": false,
      "program": { "id": "uuid", "name": "Program Name" }
    }
  ],
  "recentResults": [...],
  "stats": {
    "workoutsThisWeek": 3,
    "prsThisMonth": 1,
    "currentStreak": 5
  }
}
```

#### `GET /api/athlete/workout/[id]`
Fetches workout details with user's result.

**Query Parameters:**
- `userId` (optional): User ID to fetch their result

**Response:**
```json
{
  "success": true,
  "workout": {
    "id": "uuid",
    "title": "Workout Title",
    "name": "Workout Title",  // Mapped for compatibility
    "description": "...",      // Mapped from body
    "workout_type": "For Time",
    "body": "...",
    "scheduled_date": "2026-01-14T00:00:00Z",
    "gym_id": "uuid",
    "program": { "id": "uuid", "name": "Program Name" }
  },
  "userResult": {
    "id": "uuid",
    "result_type": "time",
    "time_seconds": 930,
    "scale": "rx",
    "displayValue": "15:30"
  }
}
```

#### `GET /api/athlete/programs`
Lists all programs for a gym.

**Query Parameters:**
- `gymId` (required): The gym ID

**Response:**
```json
{
  "success": true,
  "programs": [
    {
      "id": "uuid",
      "name": "8-Week Strength Program",
      "description": "...",
      "duration_weeks": 8,
      "focus_area": "Strength",
      "difficulty": "Intermediate",
      "calendar_data": { "start_date": "2026-01-13", "end_date": "2026-03-08" },
      "status": "active",  // active, upcoming, or completed
      "startDate": "2026-01-13",
      "endDate": "2026-03-08"
    }
  ],
  "activeProgram": { ... }  // The currently active program
}
```

#### `GET /api/athlete/programs/[id]`
Fetches a program with all its workouts.

**Query Parameters:**
- `userId` (optional): User ID to fetch their results

**Response:**
```json
{
  "success": true,
  "program": {
    "id": "uuid",
    "name": "8-Week Strength Program",
    "status": "active",
    "startDate": "2026-01-13",
    "endDate": "2026-03-08",
    ...
  },
  "workouts": [
    {
      "id": "uuid",
      "title": "Week 1, Day 1",
      "week_number": 1,
      "scheduled_date": "2026-01-13",
      "hasLogged": true,
      "isToday": false,
      "isPast": true,
      "isFuture": false,
      "displayValue": "15:30",
      "userResult": { ... }
    }
  ],
  "workoutsByWeek": {
    "1": [...],
    "2": [...]
  },
  "stats": {
    "total": 40,
    "completed": 5,
    "completionRate": 12
  },
  "todaysWorkout": { ... }
}
```

### AI Feedback Routes

#### `POST /api/ai-feedback`
Generates AI feedback for a workout result.

**Request Body:**
```json
{
  "workoutResultId": "uuid",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "feedback": {
    "id": "uuid",
    "performance_analysis": "Great workout! You maintained...",
    "strengths": ["Consistent pacing", "Strong finish"],
    "areas_for_improvement": ["Work on transitions"],
    "recovery_suggestions": ["Light mobility", "Extra sleep"],
    "next_workout_recommendations": ["Focus on pull-ups"],
    "model_used": "claude-haiku-4-5-20250514"
  }
}
```

#### `GET /api/ai-feedback`
Retrieves existing feedback for a workout result.

**Query Parameters:**
- `workoutResultId` (required): The workout result ID
- `userId` (required): The user ID

**Response:**
```json
{
  "feedback": { ... } // or null if no feedback exists
}
```

---

## Server Actions

Located in `app/actions/workoutResultActions.js`:

### Workout Result Actions

#### `logWorkoutResultAction(formData)`
Logs a workout result.

```javascript
const result = await logWorkoutResultAction({
  workout_id: "uuid",
  gym_id: "uuid",
  result_type: "time",  // time, rounds_reps, weight, reps, distance, calories
  time_seconds: 930,    // For time results
  rounds: null,         // For rounds_reps
  reps: null,           // For rounds_reps or reps
  weight_kg: null,      // For weight
  count: null,          // For reps/distance/calories
  scale: "rx",          // rx, scaled, rx_plus
  modifications: null,  // Text if scaled
  notes: "Felt great",
  perceived_effort: 8,
  include_in_leaderboard: true
});

// Returns:
{
  success: true,
  data: { ... },       // The saved result
  isPR: true,          // If this was a PR
  prData: { ... }      // PR details if applicable
}
```

#### `updateWorkoutResultAction(resultId, formData)`
Updates an existing result.

#### `deleteWorkoutResultAction(resultId)`
Soft-deletes a result (sets `deleted_at`).

#### `getWorkoutResultsAction(workoutId)`
Gets all results for a workout (for leaderboard).

#### `getMyResultsAction(limit)`
Gets the current user's recent results.

### Leaderboard Actions

#### `getLeaderboardAction(workoutId, options)`
Gets sorted leaderboard for a workout.

```javascript
const result = await getLeaderboardAction(workoutId, {
  gymId: "uuid",
  scale: "rx",  // Optional filter
  limit: 50
});

// Returns ranked entries with fist bump counts
```

### Social Actions

#### `toggleFistBumpAction(resultId)`
Toggles a fist bump on a result.

#### `addCommentAction(resultId, content)`
Adds a comment to a result.

#### `getCommentsAction(resultId)`
Gets comments for a result.

#### `deleteCommentAction(commentId)`
Soft-deletes a comment.

### PR Actions

#### `getMyPRsAction()`
Gets the current user's personal records.

---

## Athlete Features

### Athlete Dashboard (`/athlete`)

The main dashboard for athletes displays:

1. **Active Program Banner** - Prominent display of current program with link to full view
2. **Quick Stats** - Workouts this week, PRs this month, current streak
3. **Today's Workouts** - List of scheduled workouts for today
4. **Recent Activity** - Latest logged results
5. **Quick Links** - Programs, Leaderboards, PRs, History

**File:** `app/athlete/page.js`

### Workout Detail Page (`/athlete/workout/[id]`)

Three-tab interface:

1. **Workout Tab**
   - Workout description
   - User's result (if logged)
   - AI Feedback card
   - Log Result CTA

2. **Log Tab**
   - Result entry form
   - Result type selection
   - RX/Scaled toggle
   - Perceived effort slider
   - Notes field

3. **Leaderboard Tab**
   - Ranked results
   - Filter by scale
   - Fist bump functionality

**File:** `app/athlete/workout/[id]/page.js`

### Programs List (`/athlete/programs`)

Displays all programs at the athlete's gym:

- Active program highlighted at top
- Filter by status (All, Active, Upcoming, Completed)
- Program cards showing duration, dates, focus area

**File:** `app/athlete/programs/page.js`

### Program Detail (`/athlete/programs/[id]`)

Full program view with:

- Progress bar (completion rate)
- Today's workout highlight
- Program description
- Workouts organized by week (collapsible)
- Visual indicators for completed/missed/upcoming workouts

**File:** `app/athlete/programs/[id]/page.js`

---

## Coach Features

### Program Creation

When coaches create programs:

1. Program is automatically linked to their gym via `gym_id`
2. All workouts inherit the `gym_id`
3. Athletes in the gym can see the program

**Gym ID Assignment:**
```javascript
// In /api/CreateProgram/route.js
const { data: gymMembership } = await supabase
  .from('gym_memberships')
  .select('gym_id')
  .eq('user_id', userId)
  .in('role', ['owner', 'coach'])
  .eq('status', 'active');

gymId = gymMembership?.gym_id || null;
```

### Gym Management

Coaches can:
- Create a gym (becomes owner)
- Generate invite codes
- Approve/manage members
- View all athlete results and participation

---

## AI Feedback System

### How It Works

1. Athlete logs a workout result
2. Athlete clicks "Get Feedback" button
3. System calls `/api/ai-feedback` with result ID
4. API fetches:
   - Workout result details
   - Workout description
   - User profile (1RMs, etc.)
   - Recent workout history
   - Personal records
5. Builds a prompt with context
6. Calls Claude Haiku 4.5
7. Parses JSON response
8. Stores feedback in `ai_workout_feedback` table
9. Returns feedback to display

### Prompt Structure

```
You are a knowledgeable CrossFit coach providing personalized feedback...

WORKOUT DETAILS:
- Name: [workout title]
- Type: [workout type]
- Description: [workout body]

ATHLETE'S RESULT:
- Result: [formatted result]
- Scale: [rx/scaled/rx+]
- Perceived Effort: [1-10]
- Notes: [athlete notes]

[Athlete Metrics if available]
[Recent Workouts if available]
[Recent PRs if available]

Please provide feedback in JSON format...
```

### Feedback Structure

```json
{
  "performanceAnalysis": "2-3 sentence analysis",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["area 1", "area 2"],
  "recoverySuggestions": ["suggestion 1", "suggestion 2"],
  "nextWorkoutRecommendations": ["recommendation 1", "recommendation 2"]
}
```

### Model Configuration

- **Model:** `claude-haiku-4-5-20250514`
- **Max Tokens:** 1024
- **Rationale:** Fast, cost-effective for structured coaching feedback

**File:** `app/api/ai-feedback/route.js`

---

## Components Reference

### `ResultEntryForm`

Form component for logging workout results.

**Props:**
- `workoutId` - ID of the workout
- `gymId` - ID of the gym
- `workoutTitle` - Title to display
- `onSuccess(result, isPR, prData)` - Callback on successful log
- `onCancel` - Callback to cancel
- `defaultResultType` - Default result type selection

**File:** `app/components/athlete/ResultEntryForm.jsx`

### `LeaderboardView`

Displays ranked workout results.

**Props:**
- `workoutId` - ID of the workout
- `gymId` - ID of the gym
- `workoutTitle` - Title to display

**Features:**
- Filter by scale (All, RX, Scaled)
- Rank badges (gold, silver, bronze)
- Fist bump toggle
- Highlights current user

**File:** `app/components/athlete/LeaderboardView.jsx`

### `PRCelebration`

Full-screen celebration modal for PRs.

**Props:**
- `prData` - PR information
- `onClose` - Callback to close

**File:** `app/components/athlete/PRCelebration.jsx`

### `AIFeedbackCard`

Displays AI-generated feedback.

**Props:**
- `workoutResultId` - ID of the workout result
- `userId` - User ID
- `autoGenerate` - Auto-generate on mount

**Features:**
- Collapsible sections
- Fetch existing or generate new
- Loading and error states

**File:** `app/components/athlete/AIFeedbackCard.jsx`

---

## User Flows

### Athlete Joins Gym

```
1. Athlete receives invite code from coach
2. Navigates to /join/[code] or enters code on dashboard
3. Creates account (if new) or logs in
4. Membership created with status='pending' (if approval required)
   or status='active' (if no approval required)
5. Once active, athlete sees gym's workouts and programs
```

### Athlete Logs Workout Result

```
1. Athlete opens dashboard (/athlete)
2. Sees today's workouts from active program
3. Clicks on a workout
4. Views workout details (description, etc.)
5. Clicks "Log Result" tab
6. Selects result type (time, rounds+reps, etc.)
7. Enters result value
8. Selects scale (RX, Scaled, RX+)
9. Optionally adds:
   - Modifications (if scaled)
   - Perceived effort (1-10)
   - Notes
10. Submits form
11. If PR detected → PRCelebration modal appears
12. Redirected to leaderboard tab
13. Can view their rank among gym members
```

### Athlete Gets AI Feedback

```
1. After logging result, athlete sees AIFeedbackCard
2. Card shows "Get Feedback" button
3. Clicks button → loading state
4. AI generates personalized feedback
5. Performance analysis displayed
6. Can expand for:
   - Strengths
   - Areas for improvement
   - Recovery suggestions
   - Next workout recommendations
```

### Athlete Views Full Program

```
1. Athlete clicks "Programs" on dashboard
2. Sees list of all gym programs
3. Active program highlighted at top
4. Clicks on a program
5. Sees:
   - Progress bar (X% complete)
   - Today's workout highlighted
   - All workouts organized by week
6. Can expand/collapse weeks
7. Visual indicators show:
   - ✓ Completed workouts with result
   - "Today" badge for current workout
   - "Missed" for past unlogged workouts
8. Clicks any workout to view/log
```

---

## Testing Guide

### Prerequisites

1. Supabase project with migrations applied
2. Coach account with a gym
3. Athlete account that has joined the gym
4. At least one program with scheduled workouts

### Test Scenarios

#### 1. Athlete Dashboard
- [ ] Dashboard loads with gym info
- [ ] Active program banner appears
- [ ] Today's workouts display correctly
- [ ] Quick stats show accurate numbers
- [ ] Quick links navigate correctly

#### 2. Workout Result Logging
- [ ] Can select different result types
- [ ] Time input works (minutes:seconds)
- [ ] Rounds+Reps input works
- [ ] Weight input works
- [ ] Scale selection works
- [ ] Modifications field appears when Scaled selected
- [ ] Perceived effort selector works
- [ ] Notes field works
- [ ] Form submits successfully
- [ ] Result appears in "Your Result" card
- [ ] Result appears on leaderboard

#### 3. PR Detection
- [ ] First result for a workout triggers PR
- [ ] Better result than previous triggers PR
- [ ] PR celebration modal appears
- [ ] PR recorded in personal_records table

#### 4. Leaderboard
- [ ] Results sorted correctly (time: low→high, reps: high→low)
- [ ] Rank badges display (gold, silver, bronze)
- [ ] Current user highlighted
- [ ] Filter by scale works
- [ ] Fist bump toggle works

#### 5. AI Feedback
- [ ] "Get Feedback" button appears after logging
- [ ] Loading state shows during generation
- [ ] Feedback displays correctly
- [ ] Can expand for detailed feedback
- [ ] Feedback persists (stored in database)
- [ ] Subsequent visits show existing feedback

#### 6. Program Views
- [ ] Programs list shows all gym programs
- [ ] Status filter works (All, Active, Upcoming, Completed)
- [ ] Program detail shows all workouts
- [ ] Workouts organized by week
- [ ] Today's workout highlighted
- [ ] Completion indicators accurate

### Database Verification

```sql
-- Check workout results
SELECT * FROM workout_results WHERE user_id = '[athlete_id]';

-- Check PRs
SELECT * FROM personal_records WHERE user_id = '[athlete_id]';

-- Check AI feedback
SELECT * FROM ai_workout_feedback WHERE user_id = '[athlete_id]';

-- Check social interactions
SELECT * FROM social_interactions WHERE user_id = '[athlete_id]';
```

---

## Migration History

| Version | Name | Description |
|---------|------|-------------|
| 20260114000000 | add_athlete_engagement | Core tables for athlete features |
| 20260114010000 | fix_gym_rls_recursion | Fix RLS policy recursion |
| 20260114020000 | backfill_gym_id | Backfill gym_id on programs/workouts |
| 20260114030000 | fix_gym_rls_recursion_v2 | Additional RLS fixes |
| 20260114040000 | add_athlete_workout_access | RLS for athlete workout viewing |
| 20260114080000 | add_table_grants | Grants for authenticated users |
| 20260114090000 | add_athlete_program_access | RLS for athlete program viewing |

---

## File Structure

```
app/
├── athlete/
│   ├── page.js                    # Dashboard
│   ├── programs/
│   │   ├── page.js                # Programs list
│   │   └── [id]/
│   │       └── page.js            # Program detail
│   ├── workout/
│   │   └── [id]/
│   │       └── page.js            # Workout detail
│   ├── leaderboard/
│   │   └── page.js                # Leaderboards
│   ├── history/
│   │   └── page.js                # Workout history
│   └── profile/
│       └── page.js                # Profile & PRs
├── api/
│   ├── athlete/
│   │   ├── today/
│   │   │   └── route.js           # Today's workouts
│   │   ├── workout/
│   │   │   └── [id]/
│   │   │       └── route.js       # Workout detail
│   │   └── programs/
│   │       ├── route.js           # Programs list
│   │       └── [id]/
│   │           └── route.js       # Program detail
│   ├── ai-feedback/
│   │   └── route.js               # AI feedback
│   └── gyms/
│       └── ...                    # Gym management
├── actions/
│   └── workoutResultActions.js    # Server actions
├── components/
│   └── athlete/
│       ├── ResultEntryForm.jsx
│       ├── LeaderboardView.jsx
│       ├── PRCelebration.jsx
│       └── AIFeedbackCard.jsx
└── contexts/
    └── AuthContext.js             # Includes gym membership state

supabase/
└── migrations/
    ├── 20260114000000_add_athlete_engagement.sql
    ├── 20260114040000_add_athlete_workout_access.sql
    ├── 20260114080000_add_table_grants_for_athlete_tables.sql
    └── 20260114090000_add_athlete_program_access.sql
```

---

## Future Enhancements

1. **Push Notifications** - Notify athletes of new workouts, PRs, fist bumps
2. **Photo Upload** - Attach photos to workout results
3. **Video Analysis** - AI analysis of movement videos
4. **Class-Specific Programs** - Assign programs to specific classes
5. **Athlete Enrollment** - Let athletes choose which programs to follow
6. **Coach Analytics Dashboard** - Participation rates, PR tracking, performance trends
7. **Mobile App Parity** - Implement all features in halteres-mobile

---

*Last Updated: January 14, 2026*
