# Product Requirements Document: AI Program Writer Enhancements

## 1. Introduction

This document outlines the requirements for new features and improvements to the AI Program Writer in the Halteres.AI application. The goal is to enhance user experience, provide more utility for coaches, and facilitate better client interaction.

## 2. Goals

- Improve the usability of workout plans.
- Enable coaches to easily share and communicate workouts with their clients.
- Provide flexible viewing options for different use cases (e.g., gym floor, client review).

## 3. Features

### 3.1. View Only Mode (Partial Implementation In Progress)

- **Description**: Allow users (coaches) to enter a "View Only" mode for a program. In this mode, editing controls, the program writer form, and the client metrics sidebar will be hidden, providing a clean interface for reviewing the program or showing it to a client without accidental edits.
- **User Stories**:
  - As a coach, I want to switch to a view-only mode so I can review a program without the clutter of editing tools.
  - As a coach, I want to show a program to my client on my device in a clean view without risking accidental changes.
- **Requirements/Acceptance Criteria**:
  - A toggle (e.g., an eye icon) allows switching between editable and view-only mode on the program writer page.
  - In view-only mode:
    - The program generation form is hidden.
    - The client metrics sidebar is hidden or collapsed.
    - Program name editing is disabled.
    - Workout editing, deletion, and completion marking options are hidden.
    - Other interactive elements not relevant to viewing (e.g., "Save Program" button) are hidden.
  - The "View Only" state persists until toggled off.

### 3.2. Full Screen Workout View

- **Description**: Provide a feature to view an individual workout in a full-screen, distraction-free mode. This is particularly useful for casting the workout to a larger screen in a gym or for focused viewing on a mobile device.
- **User Stories**:
  - As a coach, I want to view a workout in full screen so I can easily cast it to a TV in the gym for a client or class to follow.
  - As a user, I want to view my workout in full screen on my phone for a clearer, more focused experience during my training session.
- **Requirements/Acceptance Criteria**:
  - Each workout card/item will have a "Full Screen" button/icon.
  - Clicking the button opens the selected workout in a modal or view that occupies the majority of the screen.
  - The full-screen view should clearly display the workout title, body/description, and any other relevant details.
  - The view should be scrollable if the content exceeds the screen height.
  - A clear "Close" or "Exit Full Screen" button is available.
  - The design should be clean and legible, suitable for viewing from a distance if cast.

### 3.3. Send Workout to Client

- **Description**: Enable coaches to send an individual workout directly to their client. The initial implementation could focus on email, with potential for other methods later.
- **User Stories**:
  - As a coach, I want to quickly send a specific workout to my client's email so they have a copy or can prepare for it.
- **Requirements/Acceptance Criteria**:
  - Each workout card/item will have a "Send to Client" button/icon.
  - Clicking the button will trigger a mechanism to send the workout.
  - (Phase 1 - Email):
    - If client email is associated with the program/client entity, pre-fill the email.
    - Allow the coach to confirm or enter the client's email.
    - The email content should include the workout title and body.
    - A confirmation message is shown after attempting to send.
  - (Future Considerations): SMS, in-app messaging.

### 3.4. Share Workout

- **Description**: Allow users to share a workout through common sharing options (e.g., email, text, copy to clipboard).
- **User Stories**:
  - As a coach, I want to share a workout with a colleague or another client easily.
  - As a user, I want to share a workout I like with a friend.
- **Requirements/Acceptance Criteria**:
  - Each workout card/item will have a "Share" button/icon.
  - Clicking the button presents sharing options.
  - (Phase 1):
    - **Email**: Opens default email client with workout title as subject and body pre-filled.
    - **Copy to Clipboard**: Copies workout title and body to the clipboard.
    - (Optional) **Text/SMS**: If feasible via `navigator.share` or similar.
  - The shared content should be well-formatted.

## 4. Design Considerations (General)

- UI elements should be intuitive and consistent with the existing application design.
- Features should be responsive and work well on desktop and mobile devices.

## 5. Future Considerations

- Integration with a more robust client communication system.
- Ability to share entire programs, not just individual workouts.
- Tracking if a client has viewed a sent workout.
