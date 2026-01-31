# Mobile AIProgramWriter Feature Parity Plan

---
title: feat: Achieve full AIProgramWriter feature parity in mobile app
type: feat
date: 2026-01-28
---

## Overview

This plan documents the missing features in the halteres-mobile app's AIProgramWriter compared to the web app (halteres.ai), and provides implementation tasks to achieve full feature parity.

## Current State Analysis

### Web App Features (halteres.ai)
The web app's AIProgramWriter is a comprehensive 1500+ line component with:

1. **Two-Phase Generation** (skeleton + enhancement) ✅ Mobile has this
2. **Form Configuration** (methodology, schedule, gym details) ✅ Mobile has this
3. **Real-time SSE Streaming** ✅ Mobile has this
4. **Week-by-week Enhancement** ✅ Mobile has this
5. **Reference Workout Search Modal** - Search existing workouts from database ❌ Missing
6. **Enhanced Reference Workout Search Modal** - AI-powered web search for workouts ❌ Missing
7. **Custom Workout Format Sections** - Define custom workout sections (name, duration, description) ❌ Missing
8. **Workout Format Customizer** - Drag-drop reorderable sections with templates ❌ Missing
9. **Edit Workout Modal** - Edit workout title and body inline ❌ Missing
10. **Date Picker Modal** - Change workout scheduled date ❌ Missing
11. **Reschedule Modal** - Bulk reschedule workouts ❌ Missing
12. **Program Wizard Steps** (Setup, Schedule, Customize, Review) ❌ Missing
13. **Equipment Selector** with gym presets ✅ Mobile has this
14. **Subscription/Trial Eligibility Checks** ⚠️ Partial (needs verification)

### Mobile App Current State (halteres-mobile)
The mobile app has solid core functionality:
- Two-phase generation (skeleton + enhance)
- Form configuration with auto-save
- Real-time progress with visual stepper
- Week notes before enhancement
- Skeleton preview with expandable weeks
- Workout cards with delete and completion toggle

## Gap Analysis Summary

| Feature | Web App | Mobile App | Priority |
|---------|---------|------------|----------|
| Reference Workout Search | ✅ | ❌ | High |
| Enhanced Web Search | ✅ | ❌ | Medium |
| Custom Workout Sections | ✅ | ❌ | Medium |
| Workout Format Customizer | ✅ | ❌ | Low |
| Edit Workout Modal | ✅ | ❌ | High |
| Date Picker for Workouts | ✅ | ❌ | High |
| Reschedule Modal | ✅ | ❌ | Low |
| Program Wizard Flow | ✅ | ❌ | Medium |
| Subscription Checks | ✅ | ⚠️ | High |

## Acceptance Criteria

### Phase 1: Core Missing Features (High Priority)
- [x] Users can edit workout title and body from the workout detail screen
- [x] Users can change the scheduled date of individual workouts
- [x] Subscription status and generation eligibility is properly enforced
- [x] Users can search for reference workouts from their existing programs

### Phase 2: Enhanced Features (Medium Priority)
- [ ] Users can search the web for workout ideas using AI-powered search
- [ ] Users can define custom workout sections with names and durations
- [ ] Users have a guided wizard flow for program creation

### Phase 3: Polish Features (Low Priority)
- [ ] Users can drag-drop reorder workout format sections
- [ ] Users can bulk reschedule workouts
- [ ] Users can save custom workout format templates

## Technical Approach

### Architecture
The mobile app follows React Native + Expo Router patterns with:
- Components in `/components/programs/`
- Hooks in `/hooks/`
- Types in `/lib/types/`
- Constants in `/lib/constants/`

New components should follow existing patterns:
- TypeScript with proper type definitions
- React Native Paper for UI components
- Expo Router for navigation
- Supabase for data persistence

### API Endpoints
The mobile app calls the same API endpoints as the web app. Existing endpoints to use:
- `POST /api/search-workouts` - Database workout search
- `POST /api/web-search-workouts` - AI web search
- `POST /api/generate-program-skeleton` - Skeleton generation
- `POST /api/enhance-week-details` - Week enhancement

---

## Implementation Plan

### Phase 1: Core Missing Features

#### 1.1 Edit Workout Modal

**Files to create:**
- `/components/programs/EditWorkoutModal.tsx`

**Files to modify:**
- `/components/programs/WorkoutCard.tsx` - Add "Edit" menu item
- `/app/(app)/programs/[id]/workout/[workoutId]/index.tsx` - Add edit button and modal

**Implementation:**
```typescript
// EditWorkoutModal.tsx
type EditWorkoutModalProps = {
  visible: boolean;
  workout: Workout | null;
  onDismiss: () => void;
  onSave: (workout: { id: string; title: string; body: string }) => Promise<void>;
  saving: boolean;
};
```

**Acceptance criteria:**
- Modal opens from workout card menu and workout detail screen
- Title and body are editable in TextInput fields
- Save button updates workout in Supabase
- Cancel dismisses without saving
- Loading state during save

---

#### 1.2 Date Picker for Workouts

**Files to create:**
- `/components/programs/DatePickerModal.tsx`

**Files to modify:**
- `/components/programs/WorkoutCard.tsx` - Add "Change Date" menu item
- `/hooks/useProgramWorkoutsMobile.ts` - Add `updateWorkoutDate` function

**Implementation:**
```typescript
// DatePickerModal.tsx - Use react-native-paper or @react-native-community/datetimepicker
type DatePickerModalProps = {
  visible: boolean;
  currentDate: string;
  onDismiss: () => void;
  onSave: (newDate: string) => Promise<void>;
};
```

**Acceptance criteria:**
- Calendar date picker UI
- Displays current scheduled date
- Updates workout.scheduled_date in Supabase
- Validates date is within program date range

---

#### 1.3 Reference Workout Search

**Files to create:**
- `/components/programs/ReferenceWorkoutSearchModal.tsx`
- `/hooks/useWorkoutSearch.ts`

**Files to modify:**
- `/components/programs/AIProgramWriter.tsx` - Add button to open search modal
- `/components/programs/ProgramEssentials.tsx` - Add reference workout section

**Implementation:**
```typescript
// useWorkoutSearch.ts
export function useWorkoutSearch() {
  const search = async (query: string) => {
    const response = await fetch(`${API_URL}/api/search-workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchQuery: query }),
    });
    return response.json();
  };
  return { search, results, loading, error };
}
```

**Acceptance criteria:**
- Text input for search query
- Results display as selectable workout cards
- Multi-select capability
- Selected workouts populate the reference input field
- Results show workout title and preview

---

#### 1.4 Subscription Eligibility Checks

**Files to modify:**
- `/components/programs/AIProgramWriter.tsx` - Add eligibility check before generation
- `/hooks/useSubscription.ts` (create if not exists)

**Implementation:**
```typescript
// Check before generation
const canGenerate = useMemo(() => {
  if (subscriptionStatus === 'active') return true;
  if (subscriptionStatus === 'trialing') {
    if (!trialEndDate || new Date(trialEndDate) < new Date()) return false;
    if (generationsRemaining <= 0) return false;
    return true;
  }
  return false;
}, [subscriptionStatus, trialEndDate, generationsRemaining]);
```

**Acceptance criteria:**
- Active subscribers can always generate
- Trial users checked for expiration and generations remaining
- Clear error messages when generation blocked
- Redirect to upgrade/pricing when needed

---

### Phase 2: Enhanced Features

#### 2.1 Enhanced Web Search for Workouts

**Files to create:**
- `/components/programs/EnhancedSearchModal.tsx`

**Files to modify:**
- `/components/programs/AIProgramWriter.tsx` - Add button for enhanced search

**Implementation:**
The modal should include:
- Free text search input
- Filter chips for: goal, difficulty, focusArea, duration, workoutFormat
- Equipment filter with multi-select
- Results from `/api/web-search-workouts`

**Acceptance criteria:**
- Expandable filter section
- Real-time search with debounce
- Results show AI-generated workout cards
- Can select multiple to add as reference
- Loading states for AI processing

---

#### 2.2 Custom Workout Sections

**Files to create:**
- `/components/programs/CustomWorkoutSections.tsx`

**Files to modify:**
- `/components/programs/ProgramDetailsSection.tsx` - Add custom sections UI
- `/lib/types/twoPhaseGeneration.ts` - Add CustomSection type

**Implementation:**
```typescript
type CustomSection = {
  id: string;
  name: string;
  duration?: number;
  description?: string;
};

// Store in program.workout_format as { sections: CustomSection[] }
```

**Acceptance criteria:**
- Add section button reveals form
- Section has name (required), duration (optional), description (optional)
- Display list of added sections with remove button
- Sections saved to program record

---

#### 2.3 Program Wizard Flow (Optional Enhancement)

**Files to create:**
- `/app/(app)/programs/[id]/wizard/index.tsx`
- `/app/(app)/programs/[id]/wizard/setup.tsx`
- `/app/(app)/programs/[id]/wizard/schedule.tsx`
- `/app/(app)/programs/[id]/wizard/customize.tsx`
- `/app/(app)/programs/[id]/wizard/review.tsx`
- `/components/programs/WizardProgress.tsx`

**Implementation:**
Step-by-step flow with progress indicator:
1. Setup: Goal, methodology, difficulty
2. Schedule: Days of week, number of weeks, start date
3. Customize: Gym type, equipment, workout formats
4. Review: Summary with generate button

**Acceptance criteria:**
- Progress bar shows current step
- Back/Next navigation
- Can skip directly to builder if preferred
- Data persists between steps
- Final step triggers generation

---

### Phase 3: Polish Features

#### 3.1 Workout Format Customizer with Drag-Drop

**Note:** This is complex in React Native. Consider using `react-native-draggable-flatlist`.

**Files to create:**
- `/components/programs/WorkoutFormatCustomizer.tsx`

**Acceptance criteria:**
- Drag handle to reorder sections
- Edit section name and duration inline
- Remove section button
- Reset to default button
- Save as template (using AsyncStorage)

---

#### 3.2 Reschedule Modal

**Files to create:**
- `/components/programs/RescheduleModal.tsx`

**Acceptance criteria:**
- Select multiple workouts to reschedule
- Choose new start date
- Auto-distribute based on program days
- Preview changes before applying

---

## Dependencies

### NPM Packages to Add
```json
{
  "@react-native-community/datetimepicker": "^7.x",
  "react-native-draggable-flatlist": "^4.x" // Only for Phase 3
}
```

### Shared Types
Ensure type consistency between web and mobile by referencing:
- `lib/types/twoPhaseGeneration.ts`
- `lib/constants/programConfig.ts`

---

## Testing Plan

### Unit Tests
- [ ] useWorkoutSearch hook returns results
- [ ] Subscription eligibility logic
- [ ] Date validation for scheduling

### Integration Tests
- [ ] Edit workout flow saves to Supabase
- [ ] Date picker updates scheduled_date
- [ ] Reference search populates form

### Manual Testing Checklist
- [ ] Generate program flow end-to-end
- [ ] Edit workout from card menu
- [ ] Edit workout from detail screen
- [ ] Change workout date
- [ ] Search reference workouts
- [ ] Subscription gating for non-subscribers

---

## Risk Analysis

| Risk | Mitigation |
|------|------------|
| Date picker inconsistency across iOS/Android | Use tested community packages |
| Performance with large workout lists | Implement virtualized lists, pagination |
| API compatibility | Share types, test against same endpoints |

---

## Success Metrics

- Feature parity percentage: 100%
- No regression in existing functionality
- Generation flow works identically to web
- All CRUD operations for workouts functional

---

## References

### Internal References
- Web AIProgramWriter: `app/components/AIProgramWriter/AIProgramWriter.jsx`
- Mobile AIProgramWriter: `components/programs/AIProgramWriter.tsx`
- Mobile two-phase hook: `hooks/useTwoPhaseGeneration.ts`
- Program config constants: `lib/constants/programConfig.ts`

### API Endpoints
- `/api/search-workouts` - Database search
- `/api/web-search-workouts` - AI web search
- `/api/generate-program-skeleton` - Skeleton generation
- `/api/enhance-week-details` - Week enhancement
