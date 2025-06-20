# Program Wizard Refactor Summary

## Overview
Successfully refactored the program wizard to create programs in Supabase immediately upon starting and sync data in real-time throughout the wizard process.

## Key Changes

### 1. New Data Flow
- **Before**: Program created only at the end of wizard after all steps completed
- **After**: Program created immediately when wizard starts, with auto-save on each step

### 2. Files Modified

#### Core Utilities
- **NEW**: `app/utils/programUtils.js` - Utility functions for program creation and auto-save
  - `createMinimalProgram()` - Creates program immediately with defaults
  - `autoSaveProgramStep()` - Auto-saves step data to Supabase
  - `mapStep1ToProgram()`, `mapStep2ToProgram()`, etc. - Data mapping functions

#### Store Updates
- **Modified**: `app/store/programStore.js`
  - Added `createMinimalProgram()` action
  - Added `autoSaveProgram()` action  
  - Added `loadProgramFromDatabase()` action

#### Wizard Flow
- **Modified**: `app/program-wizard/page.js`
  - Now creates program immediately when wizard starts
  - Handles entity ID from URL parameters
  - Creates program in Supabase before redirecting to step 1

#### Individual Steps
- **Modified**: `app/program-wizard/step-1/page.js`
  - Added auto-save with 1s debounce
  - Uses `loadProgramFromDatabase()` instead of old fetch method
  
- **Modified**: `app/program-wizard/step-2/page.js`
  - Added auto-save with 1s debounce
  - Uses `loadProgramFromDatabase()` instead of old fetch method

- **Modified**: `app/program-wizard/step-4/page.js`
  - Added auto-save with 1s debounce
  - Uses `loadProgramFromDatabase()` instead of old fetch method

#### Modal Integration
- **Modified**: `app/hooks/useDashboardModals.js`
  - Updated wizard navigation to pass `entityId` parameter
  - Changed route from `/program-wizard/step-1` to `/program-wizard?entityId=XXX`

#### Creating Page
- **Modified**: `app/program-wizard/creating/page.js`
  - Simplified significantly since program already exists
  - Now just finalizes and redirects to program writer

### 3. New Benefits

#### Immediate Persistence
- Program is saved to database as soon as user clicks "Start Wizard"
- No data loss if user navigates away or refreshes

#### Real-time Sync
- Each wizard step auto-saves to Supabase with 1s debounce
- Program always reflects current wizard state
- AIProgramWriter can access real-time data

#### Single Source of Truth
- Program ID is available from step 1 onwards
- All components work with the same program record
- Consistent data flow between wizard and writer

#### Better User Experience
- Faster wizard startup (program created in background)
- Visual feedback about program creation
- Can navigate back and forth without losing data

### 4. Key Functions

#### Program Creation
```javascript
// Creates minimal program immediately
const program = await createMinimalProgram({ entityId, supabase });
```

#### Auto-save
```javascript
// Auto-saves step data to database
await autoSaveProgram(stepNumber, supabase);
```

#### Data Loading
```javascript  
// Loads program data from database to form
const formData = await loadProgramFromDatabase(programId, supabase);
```

### 5. API Integration
- Uses existing `/api/CreateProgram` endpoint for initial creation
- Auto-save updates go directly through Supabase client
- Maintains compatibility with existing AIProgramWriter

### 6. Error Handling
- Graceful fallbacks if program creation fails
- Error messages with automatic redirects
- Validation for required parameters (entityId, programId)

## Usage Flow

1. User clicks "Start Wizard" from dashboard modal
2. Modal passes `entityId` to `/program-wizard?entityId=XXX`
3. Wizard main page creates minimal program in Supabase immediately
4. Redirects to step 1 with `programId` parameter
5. Each step loads existing data and auto-saves changes
6. Final step redirects to AIProgramWriter with existing program

## Backward Compatibility
- Existing programs still work with wizard
- AIProgramWriter unchanged (already supported programId prop)
- Database schema unchanged (uses existing fields)
- API endpoints unchanged

## Testing Needed
- [ ] Test wizard creation flow end-to-end
- [ ] Verify auto-save works on all steps  
- [ ] Test navigation between wizard and writer
- [ ] Verify existing programs still work
- [ ] Test error scenarios (network issues, auth problems)

## Next Steps
1. Test the complete flow to ensure everything works
2. Update any remaining steps (step-3, step-5) with auto-save
3. Consider adding visual auto-save indicators
4. Monitor for any performance issues with real-time saving