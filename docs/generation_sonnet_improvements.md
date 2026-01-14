# Plan: Speed Up AI Workout Generation & Make Resilient to Page Navigation

## Problem Statement

**Current State:**
- 8-week, 5 days/week programs (40 workouts) take **30 minutes** to generate
- Exceeds Vercel timeout (13.3 min) → **generation fails completely**
- Uses Claude Sonnet 4.5 (5-10x slower than previous Haiku)
- If user leaves page → stream breaks → no workouts saved (all-or-nothing)
- Sequential week-by-week generation with no optimization

**User Requirements:**
- Speed up to prevent timeouts
- Maintain real-time streaming when user is present
- Allow users to leave/navigate away without losing progress
- Minimal architecture changes (no new infrastructure like Redis/queues)

## Solution: Two-Phase Generation System + Resilient Processing

### Core Innovation

Split generation into two phases:
1. **Phase 1: Skeleton Generation** - Fast structure-only workouts (10-12 min for 40 workouts)
2. **Phase 2: Detail Enhancement** - Progressive week-by-week detail addition (2-3 min per week, on-demand)

**Benefits:**
- ✅ No timeouts (each API call < 13 minutes, stays within 13.3 min limit)
- ✅ Users see full program structure in 10-12 minutes (not 30+)
- ✅ Progressive enhancement allows approval workflow
- ✅ Incremental saves prevent data loss on navigation
- ✅ Consistent quality using Sonnet 4.5 for all phases

---

## Implementation Plan

### Phase 1: Database Schema Changes (Use Supabase MCP)

Add columns to `program_workouts` table to support two-phase generation:

```sql
ALTER TABLE program_workouts
ADD COLUMN body_skeleton TEXT,
ADD COLUMN generation_status TEXT DEFAULT 'pending'
  CHECK (generation_status IN ('pending', 'skeleton', 'detailed', 'enhancing')),
ADD COLUMN week_number INTEGER;

-- Backfill existing workouts
UPDATE program_workouts
SET generation_status = 'detailed'
WHERE body IS NOT NULL;

-- Extract week numbers from titles
UPDATE program_workouts
SET week_number = CAST(SUBSTRING(title FROM 'Week ([0-9]+)') AS INTEGER)
WHERE title LIKE 'Week %';

-- Add index for performance
CREATE INDEX idx_program_workouts_generation_status
ON program_workouts(generation_status);
```

**Schema Design:**
- `body_skeleton` - Structure-only workout (exercises, sets/reps, no coaching cues)
- `body` - Full detailed workout (NULL until Phase 2)
- `generation_status` - Tracks state: `skeleton` → `enhancing` → `detailed`
- `week_number` - Enables batch "Enhance Week X" operations

**Add to `programs` table for progress tracking:**

```sql
ALTER TABLE programs
ADD COLUMN generation_status TEXT DEFAULT 'pending',
ADD COLUMN generation_progress JSONB DEFAULT '{"current_week": 0, "total_weeks": 0}',
ADD COLUMN generation_session_id TEXT;
```

---

### Phase 2: Skeleton Generation API Route

**New Route:** `/app/api/generate-program-anthropic-skeleton/route.js`

**Key Optimizations:**
1. **Use Sonnet 4.5** for consistent quality across both phases
2. **Reduced tokens** - Structure-only requires ~500 tokens vs. 2,500 for full workout (80% reduction)
3. **Simplified prompts** - No coaching cues, just exercise names and rep schemes
4. **Incremental saves** - Save each week to DB immediately (not at end)

**Skeleton Prompt Strategy:**
```javascript
const skeletonSystemPrompt = `Generate MINIMAL workout structure.
Include ONLY the core workout sections the user requested (e.g., Strength and Conditioning).
NO warm-up, NO cool-down, NO coaching cues, NO scaling, NO detailed explanations.
Just exercise names, sets/reps/weights for the main workout sections.
Be extremely concise.`;

// Week 1 gets brief program description
const week1Prompt = `Generate brief program description (2-3 sentences) + workout structures for Week 1.

Program: ${goal}, ${difficulty}, ${numberOfWeeks} weeks, ${daysPerWeek} days/week
Equipment: ${equipment.join(', ')}

Output JSON:
{
  "programDescription": "Brief 2-3 sentence overview of the program approach and progression",
  "workouts": [
    {
      "title": "Week 1, Day 1: [Focus]",
      "body": "## Strength\n- Exercise: Sets x Reps @ %\n\n## Conditioning\n- Format: movements, reps",
      "date": "YYYY-MM-DD"
    }
  ]
}`;

// Other weeks: just workouts
const weekPrompt = `Week ${weekNumber} of ${numberOfWeeks} - ${daysPerWeek} workouts

Output JSON with workout structures (main sections only):
{
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day 1: [Focus]",
      "body": "## Strength\n- Exercise: Sets x Reps\n\n## Conditioning\n- Format: movements, reps",
      "date": "YYYY-MM-DD"
    }
  ]
}`;
```

**Configuration:**
```javascript
model: 'claude-sonnet-4-5-20250929', // Consistent quality
max_tokens: 4000, // Down from 16000 (skeleton needs less)
temperature: 0.5, // Less creativity needed for structure
stream: true
```

**Expected Performance:**
- 40 workouts × ~12-15 seconds = **8-10 minutes** (vs. 30+ minutes currently)
- Well under 13.3 min timeout ✅
- 3-4x faster due to:
  - 85-90% token reduction (only core sections, no warm-up/cool-down)
  - Simpler prompts (300-400 tokens vs 2,500 per workout)
  - Faster processing with minimal content

**Example Skeleton Output:**
```markdown
Week 1, Day 1: Lower Body Strength

## Strength
- Back Squat: 5x5 @ 75% 1RM
- ♀ 135 lbs / ♂ 185 lbs

## Conditioning
- 21-15-9 for time:
  - Thrusters (95/65 lbs)
  - Pull-ups
- Time cap: 12 minutes
```

**Example Enhanced Output (after user approves Week 1):**
```markdown
Week 1, Day 1: Lower Body Strength

## Stimulus and Strategy
Primary focus: Lower body strength development with moderate conditioning.
Maintain 75-80% intensity on squats with full recovery. Conditioning should be
moderate pace, targeting sub-10 minute completion.

## Warm-up
**General (5 min):** 3 rounds: 10 air squats, 10 leg swings/leg, 200m easy jog
**Specific (5 min):** Back squat progression: Empty bar x10, 50% x5, 65% x3

## Strength
- Back Squat: 5x5 @ 75% 1RM
- ♀ 135 lbs / ♂ 185 lbs
- Rest 3-5 minutes between sets

**Coaching Cues:**
• Chest up, eyes forward
• Drive through heels, maintain midfoot pressure
• Full depth (hip crease below knee)
• Explosive ascent, controlled descent

**Scaling:**
• Beginner: Goblet squats 3x10 @ 35/25 lbs
• Advanced: Add tempo (3-1-1-0)

## Conditioning
- 21-15-9 for time:
  - Thrusters (95/65 lbs)
  - Pull-ups
- Time cap: 12 minutes

**Strategy:** Steady pace, break thrusters into manageable sets (10-11, then 5-5-5)
**Scaling:** Reduce weight to 75/55 or 65/45 lbs; banded/jumping pull-ups

## Cool-down
- 2 rounds: 1:00 couch stretch each leg, 1:00 pigeon pose/side
- 10 cat-cow stretches, 3 min easy walking
```

**Implementation Notes:**
- Reuse SSE streaming from existing route (`/app/api/generate-program-anthropic/route.js`)
- Save workouts to DB after each week with `generation_status: 'skeleton'`
- Stream `skeleton_chunk` events to client for real-time display
- Update `programs.generation_progress` after each week

---

### Phase 3: Detail Enhancement API Route

**New Route:** `/app/api/enhance-week-details/route.js`

**Purpose:** Add full coaching details to approved skeleton workouts for a specific week

**Request Body:**
```javascript
{
  programId: "uuid",
  weekNumber: 3,
  workoutIds: ["uuid1", "uuid2", ...],
  context: {
    goal: "strength",
    difficulty: "intermediate",
    equipment: [...],
    clientMetrics: {...}
  },
  weekSpecificInput: "Focus more on upper body this week. Client mentioned shoulder tightness, so include extra mobility work." // Optional user input
}
```

**Enhancement Flow:**
1. Fetch skeleton workouts from DB (`generation_status = 'skeleton'`)
2. Mark workouts as `enhancing`
3. Call Anthropic with skeleton + "add details" prompt
4. Validate structure preserved (same exercises/reps/sets)
5. Save enhanced `body` field, update status to `detailed`
6. Stream progress via SSE

**Enhancement Prompt Strategy:**
```javascript
const enhancePrompt = `Enhance these skeleton workouts with full details.

SKELETON WORKOUTS (Week ${weekNumber}):
${skeletonWorkouts.map(w => `${w.title}\n${w.body_skeleton}`).join('\n---\n')}

SKELETON CONTAINS: Just the core sections (${userRequestedSections.join(', ')})

${weekSpecificInput ? `
USER ADJUSTMENTS FOR THIS WEEK:
"${weekSpecificInput}"

IMPORTANT: Incorporate these adjustments into your enhancements. Modify exercises, add specific warm-ups, adjust volume/intensity, or add notes as requested.
` : ''}

YOU MUST ADD:
1. **Warm-up section** - Detailed progression from general to specific
2. **Cool-down section** - Specific stretches and recovery
3. **Stimulus and Strategy** - Training focus and approach for the day
4. **Coaching cues** for each movement (3-5 specific cues)
5. **Scaling options** for different fitness levels
6. **Detailed instructions** for complex movements

CRITICAL RULES:
- DO NOT change exercises, sets, reps, weights, or percentages in ${userRequestedSections.join('/')} sections
- ONLY ADD the missing sections and details
- Preserve the exact structure of core workout sections
- Output complete workout with all sections

Example structure:
## Stimulus and Strategy
[Why this workout, approach, pacing]

## Warm-up
[Detailed warm-up with progressions]

## Strength (from skeleton - DO NOT MODIFY)
[Original strength section with added coaching cues]

## Conditioning (from skeleton - DO NOT MODIFY)
[Original conditioning section with added coaching cues and scaling]

## Cool-down
[Specific recovery protocol]`;
```

**Configuration:**
```javascript
model: 'claude-sonnet-4-5-20250929', // Use Sonnet for quality
max_tokens: 16000,
temperature: 0.7,
stream: true
```

**Expected Performance:**
- 5 workouts per week × ~25-30 seconds = **2-2.5 minutes per week**
- Well under timeout ✅
- Faster than full generation because structure is already provided

**Validation Layer:**
```javascript
function validateStructurePreserved(skeleton, enhanced) {
  const skeletonExercises = extractExercises(skeleton);
  const enhancedExercises = extractExercises(enhanced);

  if (!arraysEqual(skeletonExercises, enhancedExercises)) {
    throw new Error('Structure not preserved - exercises changed');
  }

  // Check rep schemes unchanged
  const skeletonReps = extractRepSchemes(skeleton);
  const enhancedReps = extractRepSchemes(enhanced);

  if (!arraysEqual(skeletonReps, enhancedReps)) {
    throw new Error('Structure not preserved - rep schemes changed');
  }

  return true;
}
```

If validation fails, reject enhancement and keep skeleton intact.

---

### Phase 4: Additional Speed Optimizations (Apply to Both Routes)

**1. Prompt Caching (30-50% faster)**

Anthropic SDK v0.51.0 supports prompt caching. Cache repeated content:

```javascript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 16000,
  system: [
    {
      type: "text",
      text: baseSystemPrompt,
    },
    {
      type: "text",
      text: clientMetricsContent,
      cache_control: { type: "ephemeral" }
    },
    {
      type: "text",
      text: referenceWorkoutsContent,
      cache_control: { type: "ephemeral" }
    }
  ],
  messages: [{ role: 'user', content: weekPrompt }],
  stream: true
});
```

**Cache these for all weeks:**
- System prompt (~1,500 chars)
- Client metrics
- Reference workouts
- Equipment/methodology context

**Benefits:**
- 50% latency reduction on cache hits
- 90% cost reduction for cached tokens
- Zero architectural changes

**2. Optimize max_tokens (20-40% faster)**

Current uses 16,000 for all weeks. Optimize based on week:

```javascript
const maxTokensForWeek = weekNumber === 1
  ? 6000  // Week 1 needs program description
  : 3000; // Other weeks just need workouts
```

**3. Remove Artificial Delays**

Change line 225 in `route.js`:
```javascript
// Current
await new Promise((resolve) => setTimeout(resolve, 1000));

// Optimized
await new Promise((resolve) => setTimeout(resolve, 100));
```

Saves 5-6 seconds per program.

---

### Phase 5: Client-Side Changes

**File:** `/app/components/AIProgramWriter/programActions.js`

**1. Add Polling Mechanism**

For resilient generation when user navigates away:

```javascript
async function pollGenerationStatus(programId, supabase) {
  const { data } = await supabase
    .from('programs')
    .select('generation_status, generation_progress')
    .eq('id', programId)
    .single();

  return data;
}

async function pollUntilComplete(programId, supabase, callbacks) {
  const pollInterval = 2000; // 2 seconds

  const poll = async () => {
    const status = await pollGenerationStatus(programId, supabase);

    // Fetch workouts incrementally
    const { data: workouts } = await supabase
      .from('program_workouts')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: true });

    callbacks.updateWorkouts(workouts);

    if (status.generation_status === 'completed') {
      callbacks.showToast('Generation complete!', 'success');
      return;
    }

    // Continue polling
    setTimeout(poll, pollInterval);
  };

  await poll();
}
```

**2. Add Week Enhancement Action**

```javascript
export async function approveAndEnhanceWeek({
  programId,
  weekNumber,
  workouts,
  context,
  updateWorkoutStatus,
  showToast,
}) {
  showToast(`Enhancing Week ${weekNumber}...`, 'info');

  const response = await fetch('/api/enhance-week-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      programId,
      weekNumber,
      workoutIds: workouts.map(w => w.id),
      context,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // Process SSE stream
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    // Parse SSE events
    const messages = decoder.decode(value).split('\n\n');
    for (const message of messages) {
      if (message.startsWith('data: ')) {
        const data = JSON.parse(message.substring(6));

        if (data.type === 'enhanced_workout') {
          updateWorkoutStatus(data.workout.id, {
            body: data.workout.body,
            generation_status: 'detailed',
          });
        }
      }
    }
  }

  showToast(`Week ${weekNumber} enhanced!`, 'success');
}
```

**3. Handle Stream Disconnection**

Gracefully switch from streaming to polling if stream breaks:

```javascript
try {
  const { value, done } = await reader.read();
  // ... process stream
} catch (streamError) {
  console.log('Stream disconnected, switching to polling');
  pollUntilComplete(programId, supabase, callbacks);
}
```

---

### Phase 6: UI Changes

**File:** `/app/components/AIProgramWriter/WorkoutList.jsx`

**1. Add Skeleton/Detailed Badges**

```jsx
{workout.generation_status === 'skeleton' && (
  <span className="badge badge-warning">SKELETON - Structure Only</span>
)}

{workout.generation_status === 'detailed' && (
  <span className="badge badge-success">DETAILED</span>
)}

{workout.generation_status === 'enhancing' && (
  <span className="badge badge-info">
    <span className="loading loading-spinner loading-xs mr-1"></span>
    Enhancing...
  </span>
)}
```

**2. Add Week Approval UI with Input Field**

```jsx
{currentWeekData.workouts.every(w => w.generation_status === 'skeleton') && (
  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <h4 className="font-semibold text-yellow-900">
          Week {currentWeek} Structure Generated
        </h4>
        <p className="text-sm text-yellow-800 mt-1">
          Review the workout structure below. Add any week-specific adjustments,
          then approve to generate full details.
        </p>
      </div>
    </div>

    {/* Week-specific input field */}
    <div className="mt-3">
      <label className="label">
        <span className="label-text font-medium">
          Week {currentWeek} Adjustments (Optional)
        </span>
      </label>
      <textarea
        className="textarea textarea-bordered w-full"
        placeholder="E.g., 'Focus more on upper body', 'Client has shoulder pain - adjust exercises', 'Add extra conditioning volume'"
        value={weekInputs[currentWeek] || ''}
        onChange={(e) => setWeekInput(currentWeek, e.target.value)}
        rows={3}
      />
      <p className="text-xs text-gray-600 mt-1">
        This input will be incorporated into the detailed workout generation.
        Leave blank to use the skeleton as-is.
      </p>
    </div>

    <button
      className="btn btn-primary mt-3"
      onClick={() => handleApproveWeek(currentWeek, weekInputs[currentWeek])}
    >
      Approve & Add Details to Week {currentWeek}
      <span className="text-xs ml-2">(~2-3 minutes)</span>
    </button>
  </div>
)}
```

**3. Add Progress Indicator**

```jsx
<div className="mt-6 p-4 bg-base-200 rounded-lg">
  <div className="flex justify-between items-center mb-2">
    <h4 className="font-semibold">Detail Enhancement Progress</h4>
    <span className="text-sm text-gray-600">
      {detailedWeeks} of {totalWeeks} weeks detailed
    </span>
  </div>
  <div className="w-full bg-gray-300 rounded-full h-3">
    <div
      className="bg-success h-3 rounded-full transition-all duration-300"
      style={{ width: `${(detailedWeeks / totalWeeks) * 100}%` }}
    />
  </div>
</div>
```

**4. Display Skeleton vs Detailed Content**

```jsx
<div className="workout-content">
  {workout.generation_status === 'detailed' ? (
    <div dangerouslySetInnerHTML={{
      __html: parseMarkdownToHTML(workout.body || workout.body_skeleton)
    }} />
  ) : (
    <>
      <div dangerouslySetInnerHTML={{
        __html: parseMarkdownToHTML(workout.body_skeleton)
      }} />
      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
        <p className="text-xs text-gray-600">
          ℹ️ <strong>Skeleton version</strong> - Shows exercise structure only.
          Click "Approve Week" to add coaching cues and detailed instructions.
        </p>
      </div>
    </>
  )}
</div>
```

**File:** `/app/components/AIProgramWriter/AIProgramWriter.jsx`

**5. Add State for Week-Specific Inputs**

```javascript
// Track user input for each week
const [weekInputs, setWeekInputs] = useState({});

const setWeekInput = (weekNumber, input) => {
  setWeekInputs(prev => ({
    ...prev,
    [weekNumber]: input
  }));
};

// When approving a week, pass the input
const handleApproveWeek = async (weekNumber, weekInput) => {
  await approveAndEnhanceWeek({
    programId,
    weekNumber,
    workouts: getWeekWorkouts(weekNumber),
    context: programContext,
    weekSpecificInput: weekInput || '', // Include user input
    updateWorkoutStatus,
    showToast,
  });

  // Clear input after successful enhancement
  setWeekInput(weekNumber, '');
};
```

**6. Detect In-Progress Generation on Mount**

```javascript
useEffect(() => {
  if (!programId) return;

  const checkGenerationStatus = async () => {
    const { data } = await supabase
      .from('programs')
      .select('generation_status, generation_progress')
      .eq('id', programId)
      .single();

    if (data?.generation_status === 'generating') {
      setGenerationStage('resuming');
      showToast('Resuming generation...', 'info');

      // Start polling
      pollUntilComplete(programId, supabase, {
        updateWorkouts: setWorkouts,
        showToast,
      });
    }
  };

  checkGenerationStatus();
}, [programId]);
```

---

### Phase 7: Incremental Saves for Resilience

**File:** `/app/api/generate-program-anthropic-skeleton/route.js`

**Modify generation loop to save after each week:**

```javascript
async function generateProgramChunked(...) {
  // ... initialization

  for (let currentWeek = 1; currentWeek <= numberOfWeeks; currentWeek++) {
    // Generate week workouts
    const weekWorkouts = await generateWeekWorkouts(...);

    // CRITICAL: Save to DB immediately (not at end)
    if (sharedData.programId && weekWorkouts.length > 0) {
      await supabase
        .from('program_workouts')
        .insert(
          weekWorkouts.map(w => ({
            program_id: sharedData.programId,
            entity_id: sharedData.entityId,
            title: w.title,
            body_skeleton: w.body, // Save as skeleton
            body: null, // Not detailed yet
            generation_status: 'skeleton',
            week_number: currentWeek,
            scheduled_date: w.date,
          }))
        );

      // Update program progress
      await supabase
        .from('programs')
        .update({
          generation_progress: {
            current_week: currentWeek,
            total_weeks: numberOfWeeks,
            workouts_saved: allWorkouts.length,
          }
        })
        .eq('id', sharedData.programId);
    }

    // Stream to client
    sendEvent(controller, encoder, 'skeleton_chunk', {
      week: currentWeek,
      workouts: weekWorkouts,
    });
  }

  // Mark complete
  await supabase
    .from('programs')
    .update({ generation_status: 'completed' })
    .eq('id', sharedData.programId);
}
```

**Benefits:**
- If user leaves page → workouts already saved
- If timeout occurs → partial program is usable
- User can resume from last completed week

---

## Critical Files

### Files to Create

**Backend (Two-Phase Generation):**
1. `/app/api/generate-program-anthropic-skeleton/route.js` - Skeleton generation route
2. `/app/api/enhance-week-details/route.js` - Detail enhancement route
3. Database migration (via Supabase MCP) - Add body_skeleton, generation_status, week_number

**Frontend (UI Redesign):**
4. `/app/components/AIProgramWriter/ProgramStepper.jsx` - Step indicator component
5. `/app/components/AIProgramWriter/steps/ProgramSetupStep.jsx` - Step 1: Goal, methodology
6. `/app/components/AIProgramWriter/steps/ProgramScheduleStep.jsx` - Step 2: Days, weeks, dates
7. `/app/components/AIProgramWriter/steps/ProgramCustomizeStep.jsx` - Step 3: Equipment, formats
8. `/app/components/AIProgramWriter/steps/ProgramReviewStep.jsx` - Step 4: Summary before generate
9. `/app/components/AIProgramWriter/SkeletonPreview.jsx` - Two-phase week-by-week view
10. `/app/components/AIProgramWriter/GenerationProgress.jsx` - Full-screen generation loader

### Files to Modify

**Backend:**
1. `/app/api/generate-program-anthropic/route.js` (1367 lines)
   - Add prompt caching
   - Optimize max_tokens
   - Add incremental saves
   - Remove delays

2. `/app/utils/prompt-builder/promptBuilder.js` (555 lines)
   - Create skeleton prompt templates (minimal structure)
   - Create enhancement prompt templates with week-specific input support

**Frontend:**
3. `/app/components/AIProgramWriter/AIProgramWriter.jsx` (793 lines)
   - Add step state management (currentStep, stepData)
   - Integrate stepper and step components
   - Add `weekInputs` state for week-specific notes
   - Add generation status detection on mount
   - Connect to two-phase generation flow

4. `/app/components/AIProgramWriter/programActions.js` (993 lines)
   - Add `approveAndEnhanceWeek()` with `weekSpecificInput` parameter
   - Add `pollGenerationStatus()` and `pollUntilComplete()` functions
   - Handle stream disconnection gracefully

5. `/app/components/AIProgramWriter/WorkoutList.jsx` (588 lines)
   - Simplify to show only detailed workouts
   - Integrate with SkeletonPreview for skeleton state
   - Modernize workout card design

6. `/app/components/AIProgramWriter/ProgramForm.jsx` (212 lines)
   - Refactor into step components
   - Keep as wrapper for backwards compatibility

7. `/app/globals.css`
   - Add modern design utilities (shadows, transitions, glass effects)

---

## Expected Performance Improvements

### Current System
- **8-week, 40-workout program:** 30 minutes
- **Result:** ❌ TIMEOUT FAILURE (exceeds 13.3 min limit)

### Two-Phase System (Sonnet 4.5 for both phases)

**Phase 1: Skeleton Generation**
- **Model:** Claude Sonnet 4.5 (consistent quality)
- **Time:** 40 workouts × ~12-15 seconds = **8-10 minutes**
- **Result:** ✅ Full program structure visible, well under timeout

**What's in the skeleton:**
- Brief program description (Week 1 only, 2-3 sentences)
- Core workout sections only (e.g., Strength + Conditioning)
- Exercise names, sets, reps, weights/percentages
- NO warm-up, NO cool-down, NO coaching cues, NO scaling

**Why 3-4x faster than current?**
- 85-90% fewer output tokens (300-400 vs 2,500 per workout)
- Minimal content = faster AI generation
- Simpler prompts = less processing time
- No warm-up/cool-down/coaching = less reasoning

**Phase 2: Detail Enhancement** (on-demand per week)
- **Model:** Claude Sonnet 4.5 (same quality)
- **Time per week:** 5 workouts × 30-35 seconds = **2.5-3 minutes**
- **User can start using program after:** 8-10 min (skeleton) + 3 min (Week 1 details) = **11-13 minutes**

**What enhancement adds:**
- Warm-up section (detailed progression)
- Cool-down section (specific recovery)
- Stimulus and strategy section
- Coaching cues for all movements (3-5 per exercise)
- Scaling options for different levels
- Detailed instructions

**If user enhances all 8 weeks:**
- **Total time:** 8-10 + (8 × 3) = **32-34 minutes**
- **Result:** ✅ No timeouts (each phase under 13 min), similar total time but progressive

**Key Wins:**
- ✅ No timeouts (skeleton = 8-10 min, each enhancement = 2.5-3 min, all under 13 min)
- ✅ Users see full program structure in 8-10 min (not 30+ or timeout)
- ✅ Can start using after 11-13 min (Week 1 detailed)
- ✅ Progressive enhancement - only detail weeks they need immediately
- ✅ Consistent Sonnet 4.5 quality throughout
- ✅ User reviews structure before committing to full detail generation

### With Additional Optimizations
- **Prompt caching:** -30% latency per week after first
- **Optimized max_tokens:** 3000 for skeleton (vs 16000), saves processing
- **Remove delays:** -5-6 seconds total

**Optimized skeleton generation:** 40 workouts × ~8-10 seconds = **5.3-6.7 minutes** 🚀

---

## Migration Strategy

### Week 1: Parallel Implementation
- ✅ Both systems available
- ✅ Two-phase is opt-in (new users default to it)
- ✅ Feature flag: `TWO_PHASE_GENERATION_ENABLED=true`

### Week 2-3: Testing & Rollout
- ✅ Monitor performance metrics
- ✅ Collect user feedback
- ✅ Fix bugs and iterate

### Week 4: Full Migration
- ✅ Two-phase becomes default for programs > 4 weeks
- ✅ Keep legacy route only for 1-2 week programs

---

## UI/UX Redesign: Modern AIProgramWriter

### Current Issues (from screenshot analysis)

The current interface is functional but has several UX problems:

1. **Information Overload** - All form fields visible at once, overwhelming for new users
2. **Poor Visual Hierarchy** - Everything feels equally important, hard to scan
3. **Dense Layout** - Not enough whitespace, sections feel cramped
4. **Clunky Form Flow** - Users must scroll through everything before generating
5. **No Progressive Disclosure** - Advanced options shown alongside basic ones
6. **Flat Design** - Lacks depth, modern polish, and visual interest

### Design Direction: Clean, Wizard-Style Flow

Transform the dense form into a **stepped wizard** that guides users through program creation, integrating naturally with the two-phase generation system.

**Design Principles:**
- Progressive disclosure (show only what's needed at each step)
- Clear visual hierarchy with better spacing
- Modern card-based sections with subtle shadows/depth
- Celebration moments (success states, progress animations)
- Mobile-first responsive design

---

### New User Flow

```
Step 1: Program Setup       Step 2: Schedule           Step 3: Customize
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ ○ What's your goal? │    │ ○ How many weeks?   │    │ ○ Equipment?        │
│   [Strength ▼]      │    │   [4] [6] [8] [12]  │    │   [Expand Grid]     │
│                     │    │                     │    │                     │
│ ○ Training style?   │    │ ○ Days per week?    │    │ ○ Workout types?    │
│   [CrossFit ▼]      │    │   S M T W T F S     │    │   [Strength] [AMRAP]│
│                     │    │   ☑ ☑ ☐ ☑ ☑ ☐ ☐    │    │   [EMOM] [For Time] │
│ ○ Difficulty?       │    │                     │    │                     │
│   [Intermediate ▼]  │    │ ○ Start date?       │    │ ○ Focus area?       │
│                     │    │   [Jan 15, 2026]    │    │   [Full Body ▼]     │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│     [Next Step →]   │    │  [← Back] [Next →]  │    │  [← Back] [Generate]│
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘

Step 4: Review & Generate   Step 5: Skeleton Preview   Step 6: Enhance Weeks
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ Program Summary     │    │ 🎉 Structure Ready! │    │ Week 1 ✅ Detailed  │
│ ────────────────    │    │                     │    │ Week 2 ⏳ Skeleton  │
│ 8 weeks, 5 days/wk  │    │ Week 1  Week 2  ... │    │ Week 3 ⏳ Skeleton  │
│ CrossFit style      │    │ ┌─────┐ ┌─────┐     │    │ ...                 │
│ Intermediate        │    │ │Day 1│ │Day 1│     │    │                     │
│ Full Body focus     │    │ │Day 2│ │Day 2│     │    │ [Add notes for W2]  │
│                     │    │ │...  │ │...  │     │    │ [Approve Week 2]    │
│ [Edit Settings]     │    │ └─────┘ └─────┘     │    │                     │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│  [Generate Program] │    │ [Approve Week 1 →]  │    │ Progress: 1/8 weeks │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

---

### Component Redesign Specifications

#### 1. New Stepper Component

**File:** `/app/components/AIProgramWriter/ProgramStepper.jsx` (NEW)

```jsx
// Modern horizontal stepper with animated progress
<div className="flex items-center justify-between mb-8">
  {steps.map((step, index) => (
    <div key={step.id} className="flex items-center">
      {/* Step circle */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center
        transition-all duration-300 font-semibold
        ${currentStep > index
          ? 'bg-primary text-white shadow-lg shadow-primary/30'
          : currentStep === index
            ? 'bg-primary/20 text-primary border-2 border-primary'
            : 'bg-base-200 text-base-content/50'}
      `}>
        {currentStep > index ? <CheckIcon /> : index + 1}
      </div>

      {/* Step label */}
      <span className={`ml-2 text-sm font-medium hidden sm:block
        ${currentStep >= index ? 'text-base-content' : 'text-base-content/50'}
      `}>
        {step.label}
      </span>

      {/* Connector line */}
      {index < steps.length - 1 && (
        <div className={`w-12 h-1 mx-4 rounded-full transition-all duration-500
          ${currentStep > index ? 'bg-primary' : 'bg-base-200'}
        `} />
      )}
    </div>
  ))}
</div>
```

**Steps:**
1. Setup (Goal, Style, Difficulty)
2. Schedule (Weeks, Days, Start Date)
3. Customize (Equipment, Workout Types, Focus)
4. Generate (Review + Start Generation)

#### 2. Redesigned Form Sections

**ProgramSetupStep.jsx** (NEW - Step 1)

Modern card-based inputs with icons and descriptions:

```jsx
<div className="space-y-6">
  <h2 className="text-2xl font-bold text-base-content">
    Let's build your program
  </h2>
  <p className="text-base-content/60">
    Tell us about your training goals and we'll create a personalized program.
  </p>

  {/* Goal selector - large visual cards */}
  <div className="grid grid-cols-2 gap-4">
    {goals.map(goal => (
      <button
        key={goal.id}
        onClick={() => setGoal(goal.id)}
        className={`
          p-6 rounded-xl border-2 text-left transition-all duration-200
          ${selectedGoal === goal.id
            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
            : 'border-base-300 hover:border-primary/50 hover:bg-base-50'}
        `}
      >
        <div className="text-3xl mb-2">{goal.emoji}</div>
        <div className="font-semibold text-base-content">{goal.label}</div>
        <div className="text-sm text-base-content/60 mt-1">{goal.description}</div>
      </button>
    ))}
  </div>

  {/* Methodology dropdown - cleaner design */}
  <div className="form-control">
    <label className="label">
      <span className="label-text font-medium">Training Methodology</span>
    </label>
    <select className="select select-bordered w-full bg-base-100">
      <option>CrossFit</option>
      <option>Powerlifting</option>
      <option>Olympic Weightlifting</option>
      <option>Bodybuilding</option>
      <option>Hybrid</option>
    </select>
  </div>
</div>
```

**ProgramScheduleStep.jsx** (NEW - Step 2)

Visual calendar-style day picker:

```jsx
<div className="space-y-6">
  <h2 className="text-2xl font-bold">When do you train?</h2>

  {/* Duration selector - pill buttons */}
  <div>
    <label className="label"><span className="label-text font-medium">Program Length</span></label>
    <div className="flex gap-2 flex-wrap">
      {[4, 6, 8, 12].map(weeks => (
        <button
          key={weeks}
          onClick={() => setWeeks(weeks)}
          className={`
            px-6 py-3 rounded-full font-medium transition-all
            ${selectedWeeks === weeks
              ? 'bg-primary text-white shadow-lg'
              : 'bg-base-200 hover:bg-base-300'}
          `}
        >
          {weeks} weeks
        </button>
      ))}
    </div>
  </div>

  {/* Day picker - visual week grid */}
  <div>
    <label className="label"><span className="label-text font-medium">Training Days</span></label>
    <div className="flex gap-2 justify-between">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
        <button
          key={i}
          onClick={() => toggleDay(i)}
          className={`
            w-12 h-12 rounded-full font-semibold transition-all
            ${selectedDays.includes(i)
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'bg-base-200 text-base-content/60 hover:bg-base-300'}
          `}
        >
          {day}
        </button>
      ))}
    </div>
    <p className="text-sm text-base-content/60 mt-2">
      {selectedDays.length} days selected
    </p>
  </div>
</div>
```

#### 3. Redesigned Skeleton/Enhancement Flow

**SkeletonPreview.jsx** (NEW - replaces parts of WorkoutList.jsx)

Clean week-by-week view optimized for the two-phase flow:

```jsx
<div className="space-y-6">
  {/* Success header */}
  <div className="text-center py-8 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl">
    <div className="text-5xl mb-4">🎉</div>
    <h2 className="text-2xl font-bold text-base-content">
      Program Structure Ready!
    </h2>
    <p className="text-base-content/60 mt-2">
      {totalWorkouts} workouts across {totalWeeks} weeks. Review and add details below.
    </p>
  </div>

  {/* Week cards with enhancement status */}
  <div className="grid gap-4">
    {weeks.map(week => (
      <div
        key={week.number}
        className={`
          p-6 rounded-xl border-2 transition-all
          ${week.status === 'detailed'
            ? 'border-success bg-success/5'
            : week.status === 'enhancing'
              ? 'border-primary bg-primary/5 animate-pulse'
              : 'border-base-300 bg-base-100'}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`
              w-8 h-8 rounded-full flex items-center justify-center font-bold
              ${week.status === 'detailed'
                ? 'bg-success text-white'
                : 'bg-base-200 text-base-content'}
            `}>
              {week.status === 'detailed' ? '✓' : week.number}
            </span>
            <span className="font-semibold text-lg">Week {week.number}</span>
          </div>

          {/* Status badge */}
          <span className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${week.status === 'detailed'
              ? 'bg-success/20 text-success'
              : week.status === 'enhancing'
                ? 'bg-primary/20 text-primary'
                : 'bg-warning/20 text-warning-content'}
          `}>
            {week.status === 'detailed' ? 'Complete' :
             week.status === 'enhancing' ? 'Enhancing...' : 'Structure Only'}
          </span>
        </div>

        {/* Workout previews */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {week.workouts.map((workout, i) => (
            <div
              key={workout.id}
              className="p-3 bg-base-200/50 rounded-lg text-center"
            >
              <div className="text-xs text-base-content/60">Day {i + 1}</div>
              <div className="font-medium text-sm truncate">{workout.focus}</div>
            </div>
          ))}
        </div>

        {/* Enhancement action */}
        {week.status === 'skeleton' && (
          <div className="space-y-3">
            <textarea
              placeholder="Optional: Add notes for this week (e.g., 'Focus on upper body', 'Client has shoulder pain')"
              value={weekNotes[week.number] || ''}
              onChange={(e) => setWeekNote(week.number, e.target.value)}
              className="textarea textarea-bordered w-full text-sm"
              rows={2}
            />
            <button
              onClick={() => handleEnhanceWeek(week.number)}
              className="btn btn-primary w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Add Full Details to Week {week.number}
              <span className="badge badge-ghost ml-2">~2-3 min</span>
            </button>
          </div>
        )}
      </div>
    ))}
  </div>

  {/* Bulk action */}
  {hasSkeletonWeeks && (
    <div className="card bg-base-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">Enhance All Remaining Weeks</div>
          <div className="text-sm text-base-content/60">
            {skeletonWeeksCount} weeks × ~2.5 min = ~{skeletonWeeksCount * 2.5} minutes total
          </div>
        </div>
        <button className="btn btn-outline btn-primary">
          Enhance All
        </button>
      </div>
    </div>
  )}
</div>
```

#### 4. Modern Loading/Generation Screen

**GenerationProgress.jsx** (NEW - replaces LoadingButton during generation)

Full-screen generation experience with progress visualization:

```jsx
<div className="fixed inset-0 bg-base-100 z-50 flex items-center justify-center">
  <div className="max-w-lg w-full mx-4 text-center">
    {/* Animated icon */}
    <div className="relative w-32 h-32 mx-auto mb-8">
      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
      <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
      <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-white animate-bounce" />
      </div>
    </div>

    {/* Status text */}
    <h2 className="text-2xl font-bold text-base-content mb-2">
      {stage === 'generating' ? 'Creating Your Program' :
       stage === 'streaming' ? 'Building Workouts' :
       'Almost Done'}
    </h2>
    <p className="text-base-content/60 mb-8">
      {currentMessage}
    </p>

    {/* Progress bar */}
    <div className="w-full bg-base-200 rounded-full h-3 mb-4 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>

    {/* Stats */}
    <div className="flex justify-center gap-6 text-sm">
      <div className="text-center">
        <div className="font-bold text-2xl text-primary">{currentWeek}/{totalWeeks}</div>
        <div className="text-base-content/60">Weeks</div>
      </div>
      <div className="text-center">
        <div className="font-bold text-2xl text-secondary">{workoutsGenerated}</div>
        <div className="text-base-content/60">Workouts</div>
      </div>
      <div className="text-center">
        <div className="font-bold text-2xl text-accent">{elapsedTime}s</div>
        <div className="text-base-content/60">Elapsed</div>
      </div>
    </div>

    {/* Cancel button */}
    <button
      onClick={handleCancel}
      className="btn btn-ghost btn-sm mt-8 text-base-content/60"
    >
      <X className="w-4 h-4 mr-1" />
      Cancel Generation
    </button>
  </div>
</div>
```

---

### Files to Create (UI Redesign)

1. **`/app/components/AIProgramWriter/ProgramStepper.jsx`** - Step indicator component
2. **`/app/components/AIProgramWriter/steps/ProgramSetupStep.jsx`** - Step 1 form
3. **`/app/components/AIProgramWriter/steps/ProgramScheduleStep.jsx`** - Step 2 form
4. **`/app/components/AIProgramWriter/steps/ProgramCustomizeStep.jsx`** - Step 3 form
5. **`/app/components/AIProgramWriter/steps/ProgramReviewStep.jsx`** - Step 4 summary
6. **`/app/components/AIProgramWriter/SkeletonPreview.jsx`** - Two-phase preview
7. **`/app/components/AIProgramWriter/GenerationProgress.jsx`** - Full-screen loader

### Files to Modify (UI Redesign)

1. **`/app/components/AIProgramWriter/AIProgramWriter.jsx`**
   - Add step state management
   - Integrate stepper component
   - Add step navigation logic
   - Connect to two-phase generation flow

2. **`/app/components/AIProgramWriter/WorkoutList.jsx`**
   - Simplify to only show detailed workouts
   - Integrate with SkeletonPreview for skeleton state
   - Modernize workout card design

3. **`/app/components/AIProgramWriter/ProgramForm.jsx`**
   - Refactor into step components
   - Remove old monolithic form
   - Keep as wrapper for backwards compatibility

### Design Tokens Update

**`/app/globals.css`** - Add modern design utilities:

```css
/* Enhanced shadows for depth */
.shadow-soft { box-shadow: 0 4px 20px -2px rgba(0,0,0,0.1); }
.shadow-glow { box-shadow: 0 0 40px -10px var(--primary); }

/* Smooth transitions */
.transition-smooth { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

/* Glass effect for cards */
.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Animated gradients */
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.animated-gradient {
  background: linear-gradient(270deg, var(--primary), var(--secondary), var(--accent));
  background-size: 600% 600%;
  animation: gradient-shift 8s ease infinite;
}
```

---

### Mobile-First Responsive Design

**Breakpoint Strategy:**
- **Mobile (< 640px):** Single column, full-width steps, bottom navigation
- **Tablet (640-1024px):** Two column where appropriate, side navigation
- **Desktop (> 1024px):** Client metrics sidebar visible, spacious layout

**Mobile-Specific Patterns:**
```jsx
// Bottom sheet for step navigation on mobile
<div className="fixed bottom-0 left-0 right-0 p-4 bg-base-100 border-t sm:hidden">
  <div className="flex gap-2">
    <button className="btn btn-outline flex-1">Back</button>
    <button className="btn btn-primary flex-1">Next</button>
  </div>
</div>

// Collapsible week cards on mobile
<details className="collapse collapse-arrow bg-base-100 rounded-xl border sm:hidden">
  <summary className="collapse-title font-semibold">
    Week {week.number} - {week.status}
  </summary>
  <div className="collapse-content">
    {/* Week content */}
  </div>
</details>
```

---

### UI Redesign Summary

| Before | After |
|--------|-------|
| Dense form with all fields visible | Clean stepped wizard with progressive disclosure |
| Flat, cramped layout | Card-based sections with depth and whitespace |
| Confusing generation state | Full-screen celebration + clear progress |
| No skeleton/detail distinction | Clear visual states (skeleton vs detailed) |
| Mobile as afterthought | Mobile-first responsive design |
| Generic buttons | Contextual actions with time estimates |

**Key Benefits:**
- ✅ Easier onboarding for new users
- ✅ Cleaner visual hierarchy
- ✅ Natural fit with two-phase generation
- ✅ Modern, polished feel
- ✅ Better mobile experience
- ✅ Clear feedback at every step

---

## Verification & Testing

### Unit Tests
```javascript
// Test skeleton generation
it('should generate skeleton in < 10 seconds per workout', async () => {
  const start = Date.now();
  await generateSkeletonWorkout({ weekNumber: 1, context });
  expect(Date.now() - start).toBeLessThan(10000);
});

// Test structure preservation
it('should preserve structure during enhancement', async () => {
  const skeleton = { body: '## Strength\n- Back Squat: 5x5' };
  const enhanced = await enhanceWorkoutDetails(skeleton, context);
  expect(enhanced.body).toContain('Back Squat: 5x5');
  expect(enhanced.body).toContain('Coaching Cues');
});
```

### Integration Tests
```javascript
// End-to-end flow
it('should generate skeleton then enhance on approval', async () => {
  // Generate skeleton
  await generateSkeletonProgram({ numberOfWeeks: 2, daysPerWeek: 3 });

  // Verify skeletons created
  const skeletons = await supabase
    .from('program_workouts')
    .select('*')
    .eq('generation_status', 'skeleton');
  expect(skeletons).toHaveLength(6);

  // Enhance Week 1
  await enhanceWeek({ weekNumber: 1 });

  // Verify enhanced
  const detailed = await supabase
    .from('program_workouts')
    .select('*')
    .eq('week_number', 1);
  expect(detailed.every(w => w.generation_status === 'detailed')).toBe(true);
});
```

### Performance Tests
```javascript
// Test skeleton speed
it('should generate 40-workout skeleton in < 6 minutes', async () => {
  const start = Date.now();
  await generateSkeletonProgram({ numberOfWeeks: 8, daysPerWeek: 5 });
  const duration = (Date.now() - start) / 1000;
  expect(duration).toBeLessThan(360); // 6 minutes
}, 400000);

// Test enhancement speed
it('should enhance 1 week in < 3 minutes', async () => {
  const start = Date.now();
  await enhanceWeekWorkouts({ weekNumber: 1, workouts: mockWeek });
  const duration = (Date.now() - start) / 1000;
  expect(duration).toBeLessThan(180); // 3 minutes
}, 200000);
```

### Manual UAT Scenarios

**Two-Phase Generation:**
1. **Happy Path:** Generate 8-week program, approve Week 1 with no custom input, verify details added
2. **Custom Input:** Approve Week 2 with input "Focus on upper body strength", verify enhancement incorporates this
3. **Leave During Generation:** Close browser mid-skeleton, return, verify progress saved
4. **Edit Before Approval:** Modify skeleton manually, then approve with custom input, verify both preserved
5. **Out-of-Order Enhancement:** Enhance Week 5 before Week 1, add custom input, verify works
6. **Enhancement Failure:** Simulate timeout, verify skeleton preserved and retry works
7. **Empty Input:** Approve week with empty input field, verify enhancement proceeds normally

**UI Redesign:**
8. **Wizard Flow:** Complete all 4 steps (Setup → Schedule → Customize → Generate) smoothly
9. **Step Navigation:** Back/forward buttons work, step indicator updates correctly
10. **Mobile Responsiveness:** Test on phone - bottom nav, collapsible sections work
11. **Loading Screen:** Full-screen progress shows during skeleton generation
12. **SkeletonPreview:** Week cards display correctly, enhancement buttons work
13. **Detailed View:** After enhancement, workouts show full content with all sections

### Success Metrics
- ✅ 0% timeout failures (down from 100% for large programs)
- ✅ < 13 minutes to first detailed workout (down from 30+ min or timeout)
- ✅ > 80% user approval rate for two-phase workflow
- ✅ < 1% error rate for skeleton and enhancement
- ✅ Reduced form abandonment (cleaner wizard flow)
- ✅ Improved mobile usability scores

---

## Risk Mitigation

### Risk: Skeleton lacks sufficient structure
**Mitigation:** Validation layer checks for required sections (strength, conditioning), valid exercises, logical rep schemes. Reject and regenerate if validation fails.

### Risk: Enhancement changes structure (disobeys instructions)
**Mitigation:** Diff validation compares skeleton vs. enhanced. Reject enhancement and keep skeleton if structure not preserved.

### Risk: Users confused by two-phase workflow
**Mitigation:** Clear UI badges (yellow "SKELETON", green "DETAILED"), stepped wizard guides users, helpful hints throughout.

### Risk: Database migration breaks existing workouts
**Mitigation:** Nullable columns (backward compatible), test on staging first, rollback script ready, deploy during low-traffic period.

### Risk: Anthropic rate limits
**Mitigation:** Queue system for bulk enhancements, 429 error handling with exponential backoff, 2-second delays between requests.

### Risk: UI redesign breaks existing functionality
**Mitigation:** Keep ProgramForm.jsx as wrapper for backward compatibility. Deploy UI changes incrementally. Feature flag for new wizard flow.

---

## Summary

This plan addresses two critical issues:

### 1. Performance: Two-Phase Generation System
- **Fast skeleton** (8-10 min for 40 workouts) using Sonnet 4.5 with minimal prompts
- **Progressive enhancement** (2-3 min/week) adds full details on-demand
- **Prompt caching** - 30-50% latency reduction after first week
- **Incremental saves** - Resilient to page navigation/timeouts
- **No timeouts** - Each API call under 13 min limit

### 2. UX: Modern Wizard-Style Interface
- **Stepped wizard** replaces dense form (4 steps: Setup → Schedule → Customize → Generate)
- **Progressive disclosure** - Show only relevant options at each step
- **Modern design** - Card-based layout, depth, animations, celebrations
- **Mobile-first** - Responsive design with bottom navigation
- **Two-phase integration** - SkeletonPreview + week-by-week enhancement flow

**User Experience After Implementation:**
- Start with clean wizard: goal → schedule → customize → generate
- See full program structure in 8-10 minutes (not 30+ or timeout)
- Review skeleton structure before committing to details
- Add week-specific adjustments during approval
- Progressive enhancement only for weeks you need now
- Never lose progress due to navigation
- Modern, polished interface throughout

**Cost:** Same as current approach (~$0.30 per 40-workout program)

**Timeline:** 2-3 weeks for full implementation and rollout
