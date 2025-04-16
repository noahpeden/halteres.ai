# System Design Document: Improving Workout Program Generation Quality

## 1. Problem Statement & Goals

Recent feedback from gym owners indicates that our AI-generated workout programs lack sufficient quality and contextual adaptation, especially for different gym types (e.g., Crossfit, Globo Gym, Home Gym). The goal is to significantly improve the realism, specificity, and relevance of generated programs by customizing prompts based on gym type and other contextual factors, while keeping the codebase maintainable and extensible.

## 2. Quality Criteria

- **Contextual Relevance:** Workouts should reflect the equipment, culture, and training style of the selected gym type.
- **Specificity:** Prompts should elicit detailed, actionable, and realistic programming.
- **Extensibility:** Easy to add new gym types or prompt variations.
- **Maintainability:** Prompt logic should be modular, testable, and separated from route orchestration.
- **Customizability:** Users should be able to customize the workout format structure to match their preferences.

## 3. Key Technical Decisions (ITDs)

### ITD 1: Prompt Customization by Gym Type ✅

- **Decision:** Use a prompt builder utility that selects and assembles prompt templates based on the selected gym type.
- **Rationale:** Centralizes prompt logic, avoids route bloat, and enables easy extension for new gym types.
- **Implementation:** Created a `promptBuilder.js` that selects the appropriate template based on gym type with fallback to a generic prompt.

### ITD 2: Prompt Template Management ✅

- **Decision:** Store prompt templates as JavaScript modules, organized by gym type.
- **Rationale:** Enables version control, code review, and static analysis. Allows for type safety and IDE support.
- **Implementation:** Created separate files for each gym type (`crossfit.js`, `globo-gym.js`, `home-gym.js`, `generic.js`).

### ITD 3: API Route Cleanliness 🔄

- **Decision:** API route should only orchestrate data flow and call the prompt builder, not contain prompt construction logic.
- **Rationale:** Keeps routes focused, testable, and easy to reason about. Reduces merge conflicts and cognitive load.
- **Status:** In progress - prompt builder is ready but API route refactoring is still needed.

### ITD 4: Extensibility & Fallbacks ✅

- **Decision:** Use a factory or strategy pattern for prompt selection. If a gym type is missing, fall back to a generic prompt and log a warning.
- **Rationale:** Ensures graceful degradation and easy addition of new gym types.
- **Implementation:** Switch/case pattern in promptBuilder with fallback to generic prompt and console warning.

### ITD 5: Testing & Validation 🔄

- **Decision:** Add unit tests for the prompt builder to ensure correct prompt selection and assembly. Consider snapshot tests for prompt outputs.
- **Rationale:** Prevents regressions and ensures prompt quality as requirements evolve.
- **Status:** Not started - testing will begin after API route integration.

### ITD 6: Customizable Workout Format Templates 🆕

- **Decision:** Allow users to define custom workout section templates or use default templates based on gym type.
- **Rationale:** Provides flexibility for coaches to match their preferred coaching style and gym's specific programming approach.
- **Implementation Plan:**
  - Create a UI component for defining workout section templates (duration, order, names)
  - Update prompt templates to incorporate custom section formats
  - Support both predefined templates and custom user-defined templates

## 4. Implementation Details

### 4.1 Enhanced Context Handling ✅

The prompt builder now extracts and processes a comprehensive set of data from the request context:

- Program parameters (duration, days per week, difficulty, goal)
- Client metrics and history (including injury considerations)
- Reference workouts for inspiration
- Calendar and date scheduling information
- Equipment and gym-specific details
- Custom user requirements

### 4.2 Gym-Type Specific Templates ✅

Each gym type has specialized prompt content:

- **CrossFit:** Focuses on varied functional movements, high intensity, metabolic conditioning, and Olympic lifting
- **Globo Gym:** Emphasizes bodybuilding-style training, machine work, isolation exercises, and muscle group splits
- **Home Gym:** Concentrates on minimal equipment, bodyweight exercises, and creative use of household items
- **Generic:** Provides a well-balanced approach suitable for any gym type as a fallback

### 4.3 Conditional Formatting ✅

Templates include conditional sections based on context:

- Scaling options based on difficulty level
- Injury considerations when relevant
- Custom formatting of workout sections based on gym type (e.g., "Main Workout" vs "Strength Work")
- Date scheduling and training day alignment

### 4.4 Helper Functions ✅

Added utility functions in promptBuilder.js to:

- Format client metrics into a prompt-friendly string
- Format reference workouts for inspiration
- Detect and handle injury history
- Process and extract parameters with fallbacks

### 4.5 Customizable Workout Format Templates 🆕

The new workflow for custom workout formats will:

1. Allow users to toggle between "Default Format" and "Custom Format"
2. With custom format selected, users can:
   - Add, remove, or reorder workout sections
   - Define duration for each section
   - Name sections according to their gym's terminology
   - Save formats as templates for reuse
3. The prompt builder will incorporate this custom format into the generated prompt
4. Generated workouts will follow the user's custom format structure

## 5. Architecture Overview

**Flow:**

1. User selects gym type and other parameters in the UI (`AIProgramWriter.jsx`).
2. User can optionally customize workout format template.
3. On generate, the API route receives the request and passes gym type, format templates, and context to the prompt builder.
4. The prompt builder selects/assembles the appropriate prompt template(s) for the gym type and incorporates custom format directives.
5. The API route sends the prompt to OpenAI and returns the result.
6. The UI displays the generated program.

**Separation of Concerns:**

- **UI:** Collects user input, passes gym type, format templates, and context.
- **API Route:** Orchestrates, validates, and delegates prompt construction.
- **Prompt Builder:** Handles all prompt selection, assembly, and formatting.

## 6. Current Status and Next Steps

✅ **Completed:**

- Prompt builder module implementation
- Modular prompt templates for each gym type
- Enhanced context extraction and processing
- Specialized content for each gym type
- Fallback handling and error logging

🔄 **In Progress:**

- API route refactoring to use the prompt builder
- Integration with UI components
- Customizable workout format templates UI

⏳ **Upcoming:**

- Unit testing and validation
- Potential expansion to additional gym types
- Performance optimization (if needed)

## 7. Adding New Gym Types

To add support for a new gym type:

1. Create a new file in `app/utils/prompt-builder/prompts/` following the naming pattern (e.g., `studio-gym.js`).
2. Implement the prompt template function using the same parameter structure as the existing templates.
3. Add appropriate gym-specific content, requirements, and terminology.
4. Import the new function in `promptBuilder.js`.
5. Add a new case in the switch statement for the new gym type.

## 8. Conclusion

The refactored prompt builder significantly improves workout program generation quality by providing rich, contextual, and specialized prompts based on gym type and user context. The modular and extensible architecture allows for easy addition of new gym types and continued improvement of prompt content. The addition of customizable workout formats gives gym owners and coaches greater control over the structure of their programs to match their specific coaching methodology.
