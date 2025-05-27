# Dashboard Components

This directory contains the componentized dashboard functionality, refactored from the original monolithic `app/dashboard/page.js` file.

## Component Structure

### Main Components

- **`Dashboard.jsx`** - Main dashboard component that orchestrates all other components
- **`DashboardHeader.jsx`** - Header with title and action buttons
- **`DashboardStats.jsx`** - Statistics cards (total programs, today's workouts, etc.)
- **`ProgramsList.jsx`** - Container for programs list with filtering
- **`ProgramCard.jsx`** - Individual program card component
- **`ProgramFilter.jsx`** - Filter dropdown for programs by entity
- **`FeedbackSection.jsx`** - Feedback form and contact information section

### Modal Components

- **`EntitySelectionModal.jsx`** - Modal for selecting existing entities
- **`CreateEntityModal.jsx`** - Modal for creating new clients/classes
- **`CreateProgramModal.jsx`** - Modal for creating new programs
- **`DeleteProgramModal.jsx`** - Confirmation modal for deleting programs

## Custom Hooks

### `useDashboardData.js`

Manages all data fetching and state for:

- Programs
- Entities
- Statistics
- Loading states

### `useDashboardModals.js`

Manages all modal states and form handling for:

- Modal visibility states
- Form data (entity creation, program creation)
- API calls for CRUD operations

## Benefits of Refactoring

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components can be reused in other parts of the application
3. **Maintainability**: Easier to debug and modify individual components
4. **Testability**: Smaller components are easier to unit test
5. **Performance**: Better optimization opportunities with smaller components
6. **Code Organization**: Logical grouping of related functionality

## Usage

```jsx
import Dashboard from '@/components/dashboard/Dashboard';

export default function DashboardPage() {
  return <Dashboard />;
}
```

Or import individual components:

```jsx
import { DashboardStats, ProgramsList } from '@/components/dashboard';
```

## File Structure

```
app/components/dashboard/
├── Dashboard.jsx              # Main dashboard component
├── DashboardHeader.jsx        # Header component
├── DashboardStats.jsx         # Statistics cards
├── ProgramsList.jsx           # Programs list container
├── ProgramCard.jsx            # Individual program card
├── ProgramFilter.jsx          # Filter component
├── FeedbackSection.jsx        # Feedback section
├── EntitySelectionModal.jsx   # Entity selection modal
├── CreateEntityModal.jsx      # Create entity modal
├── CreateProgramModal.jsx     # Create program modal
├── DeleteProgramModal.jsx     # Delete confirmation modal
├── index.js                   # Component exports
└── README.md                  # This file

app/hooks/
├── useDashboardData.js        # Data management hook
├── useDashboardModals.js      # Modal management hook
└── index.js                   # Hook exports
```
