# Integration Guide for WorkoutFormatCustomizer

## 1. Updates to AIProgramWriter.jsx

Here's how to integrate the WorkoutFormatCustomizer component into the AIProgramWriter.jsx file:

### Step 1: Import the component

```jsx
import WorkoutFormatCustomizer from './WorkoutFormatCustomizer';
```

### Step 2: Add state variables for custom format

Add these to your state declarations:

```jsx
const [isCustomFormatEnabled, setIsCustomFormatEnabled] = useState(false);
const [workoutSections, setWorkoutSections] = useState([]);
```

### Step 3: Update formData to include workout format

Add a function to update the formData with workout format information:

```jsx
const handleWorkoutFormatSectionsChange = (sections) => {
  setWorkoutSections(sections);

  // Update formData with workout section information
  setFormData((prev) => ({
    ...prev,
    workoutFormatSections: sections,
    sessionDetails: {
      ...prev.sessionDetails,
      workoutFormatCustomized: isCustomFormatEnabled,
      workoutSections: sections,
    },
  }));
};

const handleToggleCustomFormat = (enabled) => {
  setIsCustomFormatEnabled(enabled);

  setFormData((prev) => ({
    ...prev,
    sessionDetails: {
      ...prev.sessionDetails,
      workoutFormatCustomized: enabled,
    },
  }));
};
```

### Step 4: Place the component in the UI

Add the WorkoutFormatCustomizer component to your UI, likely within the form area:

```jsx
{
  /* Place it where it makes sense in your layout, after your existing form fields */
}
<WorkoutFormatCustomizer
  gymType={formData.gymType}
  value={workoutSections}
  onChange={handleWorkoutFormatSectionsChange}
  isCustomFormatEnabled={isCustomFormatEnabled}
  onToggleCustomFormat={handleToggleCustomFormat}
/>;
```

### Step 5: Update formData loading logic

Update your data fetching effect to load custom format settings if available:

```jsx
// Within your useEffect for fetchProgramData
if (program) {
  const updatedFormData = updateFormDataFromProgram(program, formData);
  setFormData(updatedFormData);

  // Load custom format settings if available
  if (program.session_details?.workoutFormatCustomized) {
    setIsCustomFormatEnabled(program.session_details.workoutFormatCustomized);
  }

  if (program.session_details?.workoutSections?.length > 0) {
    setWorkoutSections(program.session_details.workoutSections);
  }

  // ... existing code ...
}
```

## 2. Updates to Prompt Templates

The `promptBuilder.js` file should now handle custom workout formats:

```javascript
// In promptBuilder.js enhancedContext creation
const enhancedContext = {
  ...context,
  // ... existing properties ...

  // Add custom workout format handling
  customWorkoutFormat: context.sessionDetails?.workoutFormatCustomized
    ? {
        enabled: true,
        sections: context.sessionDetails?.workoutSections || [],
      }
    : {
        enabled: false,
        sections: [],
      },
};
```

In each gym-type specific prompt file, add conditional formatting:

```javascript
// In crossfit.js, globo-gym.js, etc.

// In your prompt template generator
// Add this to the prompt string:

${context.customWorkoutFormat?.enabled ? `
Custom Workout Format:
The user has specified a custom workout format with the following sections:
${context.customWorkoutFormat.sections.map(section =>
  `- ${section.name}: ${section.duration} minutes`
).join('\n')}

IMPORTANT: Please structure your workout to precisely follow this format with these section names and approximate durations.
` : ''}
```

## 3. Update to API route.js

Ensure the API route passes the custom format data:

```javascript
// In generate-program/route.js

// Make sure the sessionDetails object that contains workout format info
// is passed to the prompt builder

const contextForPrompt = {
  // ... existing context
  sessionDetails: requestData.session_details || {},
  // ... other properties
};

const prompt = promptBuilder(contextForPrompt, gymType);
```

## 4. Add react-beautiful-dnd Dependency

You'll need to install react-beautiful-dnd for the drag and drop functionality:

```bash
npm install react-beautiful-dnd
# or
pnpm add react-beautiful-dnd
```
