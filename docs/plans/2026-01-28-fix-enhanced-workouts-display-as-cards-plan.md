---
title: "Fix: Enhanced Workouts Display as Markdown Instead of Cards"
type: fix
date: 2026-01-28
---

# Fix: Enhanced Workouts Display as Markdown Instead of Cards

## Overview

After enhancing a week in the AIProgramWriter, workouts display as raw markdown text instead of properly formatted workout cards. The enhanced content shows markdown headings (`## Strength`), bullet points, and raw text rather than the styled card UI seen in the mobile app and expected by users.

## Problem Statement

### Current Behavior (Bug)
When a user enhances a week:
1. The `generation_status` changes from `'skeleton'` to `'detailed'`
2. Once all workouts in program have `generation_status !== 'skeleton'`, `hasSkeletonWorkouts` becomes `false`
3. The view switches from `SkeletonPreview` to `WorkoutList`
4. `WorkoutList` renders the `body` field as rendered markdown HTML inside a scrollable div
5. Result: Users see formatted markdown text (headings, bullets) but not structured workout cards

### Expected Behavior
After enhancement, workouts should display:
- As individual workout cards (like `SkeletonPreview` shows)
- With proper week grouping and navigation
- With day labels, dates, completion status
- With the body content shown as expandable detail or on a detail page

### Visual Evidence
User's screenshot shows Week 1 with Day tabs but the workout content below as:
```
Week 1, Day 1: Lower Body Strength
## Strength
- Back Squat: 5x5 @ 75% 1RM
  - Scaled: 95/65 lbs | RX: 135/95 lbs...
```

This is raw markdown rendered as HTML, not a workout card component.

## Root Cause Analysis

### Component Display Logic (AIProgramWriter.jsx:1364-1382)
```javascript
{/* Show SkeletonPreview if ANY skeleton workouts exist */}
{hasSkeletonWorkouts && (
  <SkeletonPreview ... />
)}

{/* Show WorkoutList only when NO skeleton workouts */}
{displayWorkouts.length > 0 && !hasSkeletonWorkouts && (
  <WorkoutList ... />
)}
```

### The Problem
`SkeletonPreview` provides a nice card-based UI with:
- Week cards with status badges (Complete/Structure Only)
- Day preview chips
- Expandable workout content

But after full enhancement, users are shown `WorkoutList` which:
- Uses `dangerouslySetInnerHTML` to render markdown as HTML
- Shows all workout content inline in a scrollable div
- Loses the structured card layout

### WorkoutList Rendering (WorkoutList.jsx:540-548)
```javascript
<div
  className="overflow-auto max-h-60 sm:max-h-80 text-sm mb-3 flex-grow"
  dangerouslySetInnerHTML={{
    __html: parseMarkdownToHTML(
      workout.body ||
      workout.description ||
      'No description available'
    )
  }}
/>
```

This renders the full workout body as formatted HTML text, not as structured sections (Warm-up, Strength, Conditioning, Cool-down, etc.).

## Proposed Solution

### Option A: Keep Using SkeletonPreview After Enhancement (Recommended)

The simplest fix is to keep showing `SkeletonPreview` for **all** workouts, not just skeletons. The component already handles both `'skeleton'` and `'detailed'` statuses with appropriate styling.

**Changes:**
1. In `AIProgramWriter.jsx`, always use `SkeletonPreview` for displaying workouts
2. Conditionally hide the "Add Full Details" button for detailed weeks
3. Remove or deprecate the `WorkoutList` component for the main program view

**Benefits:**
- Minimal code changes
- Consistent UI for all workout states
- Already-tested card layout

**File:** `app/components/AIProgramWriter/AIProgramWriter.jsx`

```jsx
// BEFORE (current logic):
{hasSkeletonWorkouts && (
  <SkeletonPreview ... />
)}
{displayWorkouts.length > 0 && !hasSkeletonWorkouts && (
  <WorkoutList ... />
)}

// AFTER (simplified):
{displayWorkouts.length > 0 && (
  <SkeletonPreview
    workouts={displayWorkouts}
    weeklyData={groupWorkoutsByWeek(displayWorkouts)}
    onEnhanceWeek={handleEnhanceWeek}
    onEnhanceAll={handleEnhanceAllWeeks}
    enhancingWeeks={enhancingWeeks}
    programContext={{
      goal: formData?.goal,
      difficulty: formData?.difficulty,
      equipment: selectedEquipment,
    }}
    // Pass callbacks for detailed workout actions
    onViewWorkoutDetails={(workout) => {
      if (workout.id) {
        router.push(`/program/${programId}/workout/${workout.id}`);
      }
    }}
    onEditWorkout={handleEditWorkout}
    onDeleteWorkout={handleDeleteWorkout}
    onMarkComplete={handleMarkComplete}
  />
)}
```

**File:** `app/components/AIProgramWriter/SkeletonPreview.jsx`

Add props for detailed workout actions and render them for detailed weeks:

```jsx
export default function SkeletonPreview({
  workouts,
  weeklyData,
  onEnhanceWeek,
  onEnhanceAll,
  enhancingWeeks = new Set(),
  programContext,
  // NEW props for detailed workout actions
  onViewWorkoutDetails,
  onEditWorkout,
  onDeleteWorkout,
  onMarkComplete,
}) {
  // ... existing code ...
}
```

In `WeekCard`, for detailed weeks, show action buttons instead of the enhance button:
```jsx
{/* For detailed weeks, show workout actions */}
{week.status === 'detailed' && onViewWorkoutDetails && (
  <div className="flex justify-end gap-2 mt-4">
    <button
      className="btn btn-sm btn-ghost"
      onClick={() => onViewWorkoutDetails(week.workouts[0])}
    >
      View Details
    </button>
  </div>
)}
```

### Option B: Enhance WorkoutList to Match SkeletonPreview Card Layout

If `WorkoutList` must remain the post-enhancement view, it needs significant refactoring to use card-based layout instead of inline markdown rendering.

This is more work and duplicates what `SkeletonPreview` already does well.

## Acceptance Criteria

### Functional Requirements
- [ ] Enhanced workouts display in card format (not raw markdown)
- [ ] Week grouping is preserved after enhancement
- [ ] Day labels and dates display correctly
- [ ] Completion status badges show correctly
- [ ] "View Details" button works for enhanced workouts
- [ ] Edit/Delete actions work for enhanced workouts

### Non-Functional Requirements
- [ ] No UI flicker when transitioning from skeleton to detailed
- [ ] Consistent styling between skeleton and detailed views
- [ ] Mobile-responsive layout maintained

## Files to Modify

### Web App (halteres.ai)

1. `app/components/AIProgramWriter/AIProgramWriter.jsx`
   - Remove conditional `WorkoutList` rendering
   - Always use `SkeletonPreview` for workout display
   - Pass additional props for detailed workout actions

2. `app/components/AIProgramWriter/SkeletonPreview.jsx`
   - Accept new props for detailed workout actions
   - Render action buttons for detailed weeks
   - Optionally show expanded content for detailed workouts

### Mobile App (halteres-mobile)
- Verify mobile app handles this correctly
- Mobile uses `WorkoutCard.tsx` which already displays properly
- May not need changes if mobile flow is different

## Test Plan

1. Generate a skeleton program (4 weeks, 3 days/week)
2. Verify SkeletonPreview displays correctly
3. Enhance Week 1
4. Verify Week 1 shows as "Complete" with card layout (not markdown)
5. Verify Weeks 2-4 still show as "Structure Only" with enhance buttons
6. Enhance remaining weeks via "Enhance All"
7. Verify all weeks show as cards with proper actions
8. Test "View Details" navigation
9. Test Edit/Delete actions on enhanced workouts

## References

- `app/components/AIProgramWriter/WorkoutList.jsx:540-548` - Current markdown rendering
- `app/components/AIProgramWriter/SkeletonPreview.jsx:230-345` - Card-based WeekCard component
- `halteres-mobile/components/programs/WorkoutCard.tsx` - Mobile reference implementation
- `app/components/AIProgramWriter/AIProgramWriter.jsx:1364-1382` - Current display logic
