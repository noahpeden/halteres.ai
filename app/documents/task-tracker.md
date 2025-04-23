# Prompt Quality & Customization To-Dos

1. **Create Prompt Builder Module**

   - [x] Design and implement a `promptBuilder` utility that selects and assembles prompt templates based on gym type and context.
   - [x] Use a factory or strategy pattern for prompt selection.

2. **Refactor API Route**

   - [ ] Move all prompt construction logic out of `app/api/generate-program/route.js` into the new prompt builder.
   - [ ] Update the API route to call the prompt builder and handle fallbacks for unknown gym types.

3. **Develop Prompt Templates**

   - [x] Create modular prompt templates for each supported gym type (e.g., Crossfit, Globo Gym, Home Gym).
   - [x] Document each template with intended use and gym type.
   - [x] Ensure templates are version-controlled and easy to extend.

4. **Integrate with UI**

   - [ ] Update `AIProgramWriter.jsx` to ensure gym type is always passed to the API route.
   - [ ] (Optional) Allow for future expansion to other context-aware prompt customizations.

5. **Testing & Validation**

   - [ ] Add unit tests for the prompt builder to verify correct prompt selection and assembly.
   - [ ] (Optional) Add snapshot tests for prompt outputs to catch regressions.

6. **Documentation & Developer Experience**

   - [x] Document how to add new gym types and prompt templates.
   - [x] Ensure folder structure and naming conventions are clear and consistent.

7. **Error Handling & Fallbacks**

   - [x] Implement logging and fallback to a generic prompt if a gym type is missing.

8. **Enhanced Context Handling**

   - [x] Implement comprehensive context extraction from request data.
   - [x] Support client metrics and reference workouts in prompts.
   - [x] Support date scheduling and training days.
   - [x] Handle injury history and scaling options conditionally.

9. **Type-specific Customization**

   - [x] Create specialized prompt content for each gym type.
   - [x] Implement default fallbacks for equipment based on gym type.
   - [x] Add gym-specific requirements and terminology.

10. **Customizable Workout Format Templates** 🆕

- [ ] Design and implement UI for custom workout format selection in AIProgramWriter.jsx:
  - [ ] Create toggle between Default and Custom formats
  - [ ] Build UI for adding, removing, and reordering workout sections
  - [ ] Add duration inputs for each section
  - [ ] Implement section naming fields
- [ ] Update prompt templates to support custom workout sections:
  - [ ] Modify promptBuilder.js to handle custom format data
  - [ ] Update each gym-type prompt to conditionally use custom formats
  - [ ] Handle validation and defaults for custom formats
- [ ] Modify API route to pass custom format data to the prompt builder
- [ ] Add persistence for saved custom format templates

---

_Next steps: Complete API route refactoring, UI integration, and customizable workout format feature._
