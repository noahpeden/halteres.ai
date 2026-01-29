---
title: Fix AIProgramWriter Desktop Layout, Enhancement Flow, and Content Quality
type: fix
date: 2026-01-28
---

# Fix AIProgramWriter Desktop Layout, Enhancement Flow, and Content Quality

## Overview

The AI Program Writer has three critical issues affecting both web and mobile apps:

1. **Desktop layout cut-off** - Content is clipped on desktop/larger screens
2. **Enhancement requires manual instructions** - Users must add notes for enhancement to work properly
3. **Enhanced workouts lack quality content** - Missing Strategy, Coaching Cues, proper warmups/cooldowns

These issues stem from the two-phase generation migration where the enhancement API was made too minimal.

## Problem Statement / Motivation

**Current State:**
- Desktop users see a cut-off layout (visible in screenshots)
- Coaches must manually add instructions to get decent enhanced workouts
- Enhanced weeks only contain raw workouts + basic warmup/cooldown - no strategy, coaching cues, or session context

**Expected State:**
- Full responsive layout on desktop with proper scrolling
- Enhancement should produce rich content without manual input
- Enhanced workouts should match the pre-migration quality (Strategy, 12min warmup, coaching cues per exercise, pacing guidance, cooldown)

**Impact:**
- Coaches are frustrated with degraded output quality
- Desktop users cannot use the feature effectively
- The product differentiation (intelligent programming with coaching) is lost

## Proposed Solution

### Phase 1: Fix Enhancement Content Quality (API Changes)

Modify `/app/api/enhance-week-details/route.js` to:
1. **Remove the exclusion** of Strategy and Coaching Cues sections
2. **Update the enhancement prompt** to generate full rich content:
   - Stimulus and Strategy section
   - 12-minute detailed warmup
   - Coaching cues per exercise
   - Pacing strategy for conditioning
   - Accessory work section
   - 10-minute cooldown

### Phase 2: Fix Enhancement Default Behavior

Modify enhancement flow to:
1. **Add intelligent defaults** when no instructions provided
2. **Pre-populate guidance** showing what instructions can do
3. **Make enhancement work well without input** (input becomes "adjustments" not "requirements")

### Phase 3: Fix Desktop Layout

Update layout CSS to:
1. **Fix height calculation** - Audit actual header height vs hardcoded 200px
2. **Add proper overflow handling** for all panels
3. **Ensure cross-platform parity** (web app and mobile/Expo Web)

## Technical Considerations

### API Changes (enhance-week-details/route.js)

**Current problematic code (lines 394-396, 419-434):**
```javascript
NOTE: Do NOT include "Stimulus and Strategy" or "Coaching Cues" sections
```

**Must update to include:**
```javascript
YOU MUST ADD:
1. **Stimulus and Strategy** - Session intent, primary focus, training context
2. **Warm-up** - 12 minutes: General (5 min), Specific Mobility (4 min), Movement Prep (3 min)
3. **Coaching Cues** - 2-3 specific cues per main exercise
4. **Pacing Strategy** - For conditioning, target effort %, rounds goal
5. **Scaling Options** - For different fitness levels
6. **Cool-down** - 10 minutes: light cardio + stretching
```

### Layout Changes

**Web app** (`AIProgramWriter.jsx` lines 935-1397):
- Audit `lg:h-[calc(100vh-200px)]` calculation
- May need CSS custom property: `--header-height`

**Mobile app** (`AIProgramWriter.tsx` lines 704-776):
- Add Platform-specific web styling
- Consider NativeWind responsive classes or `Platform.select`

### Default Enhancement Behavior

When `weekSpecificInput` is empty, inject default context:
```javascript
const defaultEnhancement = `
Generate comprehensive workout details following the established format.
Include full coaching cues for all main lifts and movements.
Provide complete 12-minute warmup and 10-minute cooldown.
Add pacing strategy for conditioning work.
`;
```

## Acceptance Criteria

### Content Quality
- [x] Enhanced workouts include "Stimulus and Strategy" section
- [x] Enhanced workouts include "Coaching Cues" for each main exercise
- [x] Warmup is 12 minutes with General/Specific/Movement Prep structure
- [x] Cooldown is 10 minutes with cardio + stretching
- [x] Pacing strategy included for conditioning (target %, rounds goal)
- [x] Enhancement works without manual instructions (produces full content)

### Desktop Layout
- [x] Full layout visible on 1440px desktop viewport (no cut-off)
- [x] All panels scrollable with visible content
- [x] Config panel, Generated Workouts, and Client Metrics all visible
- [x] Layout responsive from mobile to desktop

### Enhancement Flow UX
- [x] Enhancement button works without adding notes
- [x] Notes field clearly marked as "optional adjustments"
- [x] Enhancement produces consistent quality regardless of input

### Cross-Platform Parity
- [x] Web app (halteres.ai) fixes applied
- [ ] Mobile app (halteres-mobile) equivalent fixes applied (skipped per user request)

## Success Metrics

1. Enhanced workouts consistently include all sections (Strategy, Warmup, Coaching Cues, Cooldown)
2. Desktop layout fully visible without horizontal/vertical clipping
3. Enhancement produces quality output with 0 user input

## Dependencies & Risks

### Dependencies
- Both repos need coordinated changes (web + mobile per CLAUDE.md)
- API changes must be backwards compatible with existing enhanced workouts

### Risks
| Risk | Mitigation |
|------|------------|
| Increased token usage from richer prompts | Monitor costs; may need to adjust prompt length |
| Longer enhancement time | Display progress indicator; target 2-3 min per week |
| Breaking existing enhanced workouts | Changes are additive - existing content unaffected |

## Implementation Phases

### Phase 1: API Enhancement (High Priority)

**Files to modify:**
- `/app/api/enhance-week-details/route.js`
  - Lines 365-416: Update `buildEnhancementPrompt()` to include Strategy/Coaching
  - Lines 419-434: Update `buildEnhancementSystemPrompt()` to remove exclusions
  - Add default instruction injection when `weekSpecificInput` empty

**Verification:**
- Generate skeleton, enhance week 1 with no input
- Verify output contains: Strategy, 12min warmup, coaching cues, pacing, 10min cooldown

### Phase 2: Desktop Layout Fix

**Files to modify (Web App):**
- `/app/components/AIProgramWriter/AIProgramWriter.jsx`
  - Lines 935-1397: Audit and fix height calculations
  - Test with actual header measurement
  - Add CSS custom property if needed

**Files to modify (Mobile App):**
- `/halteres-mobile/components/programs/AIProgramWriter.tsx`
  - Lines 704-776: Add Platform.select for web
  - Add responsive width constraints

**Verification:**
- Open on 1440px desktop - all panels visible
- Open on 1024px tablet - layout adapts correctly
- Open on mobile - existing behavior preserved

### Phase 3: UX Polish

**Files to modify:**
- `/app/components/AIProgramWriter/SkeletonPreview.jsx` - Update week input placeholder
- `/halteres-mobile/components/programs/WeekCard.tsx` - Update input field guidance

**Verification:**
- Enhancement works with empty input field
- Placeholder text indicates "optional adjustments"

## References & Research

### Internal References
- Enhancement API: `/app/api/enhance-week-details/route.js:365-434`
- Web Layout: `/app/components/AIProgramWriter/AIProgramWriter.jsx:935-1397`
- Mobile Layout: `halteres-mobile/components/programs/AIProgramWriter.tsx:704-776`
- Two-phase docs: `/docs/generation_sonnet_improvements.md`

### Key Findings from Research
1. Enhancement API explicitly excludes Strategy/Coaching Cues (lines 394-396, 419-434)
2. Desktop layout uses hardcoded `lg:h-[calc(100vh-200px)]` without verifying header height
3. Mobile uses `flex: 1` without web-specific breakpoints
4. Optional week input with vague placeholder doesn't guide users

### Example Expected Output (from user)
The user provided a complete example of expected enhanced workout format including:
- Stimulus and Strategy (with Primary Focus, Session Context, bullet breakdowns)
- 12-minute Warmup (General Preparation, Specific Mobility, Movement Preparation)
- Olympic Lifting Work (with sets, reps, weights, coaching focus)
- Conditioning Work (with pacing strategy, target rounds, scaling options)
- Accessory Work (with tempo guidance)
- Coaching Cues (2-3 per exercise)
- 10-minute Cool-down (cardio, foam rolling, stretching)
