---
title: "Fix: Enhance All Preserves Enhanced Weeks + Remove Deprecated Button"
type: fix
date: 2026-01-28
---

# Fix: Enhance All Preserves Enhanced Weeks + Remove Deprecated Button

## Overview

Improve the "Enhance All" UX in the two-phase program generation system by:
1. Adding a confirmation dialog when users have already enhanced some weeks
2. Removing the deprecated "Enhance Program" button from the config panel
3. Porting changes to the mobile app (halteres-mobile)

## Problem Statement

The current UX has two issues:

1. **Confusing duplicate functionality**: The config panel has an "Enhance Program" button that opens `EnhanceProgramModal` - this is different from the per-week enhancement system used in `SkeletonPreview`. The config panel button should be removed as it's deprecated in favor of the newer two-phase generation system.

2. **Missing user confirmation**: When a user enhances some weeks individually, then clicks "Enhance All", there's no confirmation showing which weeks will be preserved vs enhanced. Users should see:
   - Which weeks are already enhanced (will be preserved)
   - Which weeks will be enhanced
   - Option to re-enhance already-enhanced weeks if desired

## Current Behavior Analysis

### Good (Already Working)
The `handleEnhanceAllWeeks` function in `AIProgramWriter.jsx` (lines 937-948) already correctly filters to only enhance skeleton weeks:

```javascript
const handleEnhanceAllWeeks = useCallback(async () => {
  const groupedWeeks = groupWorkoutsByWeek(workouts);
  const skeletonWeeks = groupedWeeks.filter(w => w.status === 'skeleton');
  // Only skeleton weeks are enhanced, detailed weeks are preserved
}, ...);
```

### Needs Improvement
1. No confirmation dialog before "Enhance All"
2. Deprecated "Enhance Program" button still visible in config panel (lines 1355-1363)
3. No option to re-enhance already-enhanced weeks

## Proposed Solution

### Phase 1: Remove Deprecated Button (Web)

Remove the "Enhance Program" button from the config panel in `AIProgramWriter.jsx`:

**File:** `app/components/AIProgramWriter/AIProgramWriter.jsx`
**Lines to remove:** 1355-1363

```jsx
// REMOVE THIS:
{displayWorkouts.length > 0 && (
  <button
    className="w-full mt-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-sm font-medium transition-all"
    onClick={handleEnhanceProgram}
    disabled={isEnhancingProgram}
  >
    {isEnhancingProgram ? 'Enhancing...' : 'Enhance Program'}
  </button>
)}
```

Also clean up unused imports/handlers:
- Remove `handleEnhanceProgram` handler (lines 845-851)
- Remove `handleSaveEnhancedProgram` handler (lines 853-873)
- Remove `isEnhancingProgram` state (line 124)
- Remove `EnhanceProgramModal` component usage (lines 1535-1545)
- Remove `EnhanceProgramModalComponent` import and memo (lines 27, 51)

### Phase 2: Add Confirmation Dialog for "Enhance All"

**File:** `app/components/AIProgramWriter/SkeletonPreview.jsx`

Add a confirmation dialog when "Enhance All" is clicked:

```jsx
// Add state for confirmation modal
const [showEnhanceAllConfirm, setShowEnhanceAllConfirm] = useState(false);

// Modify the Enhance All button click handler
const handleEnhanceAllClick = () => {
  if (detailedWeeks > 0) {
    // Show confirmation if some weeks are already enhanced
    setShowEnhanceAllConfirm(true);
  } else {
    // No enhanced weeks, proceed directly
    onEnhanceAll();
  }
};

// Add confirmation modal
{showEnhanceAllConfirm && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 max-w-md m-4">
      <h3 className="font-bold text-lg mb-2">Enhance Remaining Weeks?</h3>
      <p className="text-base-content/70 mb-4">
        {detailedWeeks} week{detailedWeeks > 1 ? 's have' : ' has'} already been enhanced and will be preserved.
        {skeletonWeeks} week{skeletonWeeks > 1 ? 's' : ''} will be enhanced.
      </p>
      <div className="flex flex-col gap-2">
        <button
          className="btn btn-primary w-full"
          onClick={() => {
            setShowEnhanceAllConfirm(false);
            onEnhanceAll();
          }}
        >
          Keep Enhanced, Enhance Rest ({skeletonWeeks} weeks)
        </button>
        <button
          className="btn btn-outline w-full"
          onClick={() => {
            setShowEnhanceAllConfirm(false);
            onEnhanceAll({ includeEnhanced: true });
          }}
        >
          Re-enhance All Weeks ({totalWeeks} weeks)
        </button>
        <button
          className="btn btn-ghost w-full"
          onClick={() => setShowEnhanceAllConfirm(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

### Phase 3: Update handleEnhanceAllWeeks

**File:** `app/components/AIProgramWriter/AIProgramWriter.jsx`

Modify to support re-enhancing all weeks:

```javascript
const handleEnhanceAllWeeks = useCallback(async (options = {}) => {
  const { includeEnhanced = false } = options;
  const groupedWeeks = groupWorkoutsByWeek(workouts);

  // Filter based on options
  const weeksToEnhance = includeEnhanced
    ? groupedWeeks
    : groupedWeeks.filter(w => w.status === 'skeleton');

  const enhancePromises = weeksToEnhance.map(week =>
    handleEnhanceWeek(week.weekNumber, weekInputs[week.weekNumber] || '')
  );

  await Promise.allSettled(enhancePromises);
}, [workouts, weekInputs, handleEnhanceWeek]);
```

### Phase 4: Port to Mobile App

**Location:** `../halteres-mobile/` (relative to halteres.ai)

The mobile app needs equivalent changes. Need to investigate the mobile app structure to identify:
1. Where the program enhancement UI lives
2. How to implement similar confirmation dialogs in React Native
3. Ensure feature parity between web and mobile

## Acceptance Criteria

### Functional Requirements
- [x] "Enhance Program" button removed from config panel
- [x] Clicking "Enhance All" with some enhanced weeks shows confirmation dialog
- [x] Confirmation dialog shows count of preserved vs to-be-enhanced weeks
- [x] Option to keep enhanced weeks (default)
- [x] Option to re-enhance all weeks
- [x] "Cancel" option to abort
- [x] Mobile app has feature parity

### Non-Functional Requirements
- [x] No breaking changes to existing enhancement functionality
- [x] Clean removal of deprecated code (no dead code left behind)
- [x] Consistent UI with existing modal/dialog patterns

## Technical Considerations

1. **Props change in SkeletonPreview**: The `onEnhanceAll` callback signature changes to accept options
2. **State cleanup**: Remove `isEnhancingProgram`, `handleEnhanceProgram`, `handleSaveEnhancedProgram`
3. **Mobile parity**: May need different UI patterns for React Native (ActionSheet vs Modal)

## Files to Modify

### Web App (halteres.ai)
1. `app/components/AIProgramWriter/AIProgramWriter.jsx`
   - Remove deprecated "Enhance Program" button and handlers
   - Update `handleEnhanceAllWeeks` to accept options

2. `app/components/AIProgramWriter/SkeletonPreview.jsx`
   - Add confirmation modal
   - Update "Enhance All" button click handler

### Mobile App (halteres-mobile)
1. `components/programs/AIProgramWriter.tsx`
   - Remove deprecated "Enhance" FAB button (lines 638-647)
   - Remove `showEnhanceModal` state and related handlers
   - Remove `EnhanceProgramModal` usage

2. `components/programs/SkeletonPreview.tsx`
   - Add confirmation dialog when "Enhance All" is clicked and some weeks are detailed
   - Use React Native `Alert.alert` for the confirmation

3. `hooks/useTwoPhaseGeneration.ts`
   - Update `enhanceAllRemaining` to accept options for including enhanced weeks
   - Already filters to skeleton-only weeks at line 476: `const skeletonWeeks = weeks.filter((w) => w.status === "skeleton");`

4. `components/programs/EnhanceProgramModal.tsx`
   - This file can be deleted if no longer used after removing the deprecated button

## References

- `app/components/AIProgramWriter/AIProgramWriter.jsx:937-948` - Current handleEnhanceAllWeeks
- `app/components/AIProgramWriter/AIProgramWriter.jsx:1355-1363` - Deprecated button to remove
- `app/components/AIProgramWriter/SkeletonPreview.jsx:113-146` - Current "Enhance All" section
