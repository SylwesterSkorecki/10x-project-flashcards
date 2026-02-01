# Generate View Components

This directory contains all components for the AI Flashcard Generation feature.

## Overview

The Generate view allows users to:

1. Paste source text (1,000-10,000 characters)
2. Generate flashcard candidates using AI
3. Review, edit, accept, or reject candidates
4. Bulk save accepted flashcards

## Architecture

### Main Components

#### `GeneratePage.tsx`

- Root component wrapping the entire generate view
- Manages QueryClient and Toaster
- Coordinates all subcomponents
- Handles modal states and commit flow

#### `GenerateFormPanel.tsx`

- Contains the main form for text input
- Includes TextAreaCounter and GenerateButton
- Validates input before submission

#### `TextAreaCounter.tsx`

- Textarea with real-time character counting
- Enforces max length (10,000 chars)
- Shows validation warnings for min length (1,000 chars)
- Accessible with aria-live announcements

#### `GenerateButton.tsx`

- Primary CTA button for generation
- Shows loading state with spinner
- Disabled states handled automatically

#### `GenerationStatusPanel.tsx`

- Shows generation status (pending/polling/success/failed)
- Displays elapsed time during generation
- Provides cancel functionality
- Progress bar for polling state

#### `CandidatesList.tsx`

- Renders list of generated candidates
- Handles empty states
- Proper ARIA roles for accessibility

#### `CandidateCard.tsx`

- Individual flashcard candidate display
- Shows front/back with expandable back content
- AI confidence score with color coding
- Actions: Accept, Edit, Reject
- Visual indicators for accepted/edited state

#### `EditCandidateModal.tsx`

- Modal dialog for editing candidates
- Real-time validation (front ≤200, back ≤500 chars)
- Character count with remaining display
- Keyboard shortcuts (Cmd+Enter to save)
- Focus management and accessibility

#### `CommitResultModal.tsx`

- Shows results after bulk save
- Lists saved flashcards
- Lists skipped flashcards with reasons (e.g., duplicate_front)
- Retry option for skipped items

### Custom Hook

#### `useGenerateFlow` (`src/components/hooks/useGenerateFlow.ts`)

- Encapsulates all generation logic
- TanStack Query integration:
  - Mutation for POST /api/generations
  - Query with polling for async generations
  - Mutation for commit with cache invalidation
- State management for candidates
- Error handling with toast notifications
- Actions: accept, edit, reject, commit

### Supporting Files

#### `types.ts`

- `EditedCandidateViewModel` - Extended candidate with local state
- `GenerateViewState` - Overall view state
- `GenerationStatus` - Status enum

#### `index.ts`

- Barrel export for all components and types

## API Integration

### Endpoints Used

1. **POST /api/generations**
   - Creates new generation request
   - Returns sync (200) or async (202) response
   - Sync: immediate candidates
   - Async: generation_id for polling

2. **GET /api/generations/:id**
   - Polls for generation results
   - Used in async flow
   - Returns GenerationDTO with candidates when ready

3. **POST /api/generations/:id/commit**
   - Commits accepted candidates as flashcards
   - Returns BulkSaveResult with saved/skipped items

## State Flow

```
idle
  ↓ (user clicks Generate)
pending
  ↓ (API returns)
  ├─→ success (sync, 200) - candidates ready
  └─→ polling (async, 202)
        ↓ (polling completes)
        ├─→ success - candidates ready
        └─→ failed/timeout
```

## Error Handling

- Network errors: Toast with retry suggestion
- Validation errors: Inline field-level hints
- Rate limits (429): Toast with cooldown message + redirect
- Unauthorized (401): Toast + redirect to login
- Server errors (503): Toast with support message
- Duplicates on commit: Shown in CommitResultModal as skipped

## Accessibility Features

- ARIA landmarks and labels throughout
- Focus management in modals (trap focus)
- Keyboard shortcuts (Cmd+Enter in edit modal)
- Live regions for dynamic content (counters, status)
- Proper error announcements
- Semantic HTML structure

## Toast Notifications

Using `sonner` library:

- Generation started
- Generation completed with count
- Save success/partial/failure
- Error messages with context
- Rate limit warnings

## Future Enhancements

- [ ] Cooldown UI for rate limits (timer display)
- [ ] Keyboard shortcuts for accept/reject (a/d keys)
- [ ] Session storage for state persistence on reload
- [ ] Background generation continuation
- [ ] Batch operations (accept all, reject all)
- [ ] Filtering/sorting candidates by score
- [ ] Preview mode before commit
- [ ] Undo functionality

## Testing Considerations

- Mock API responses (sync/async)
- Test polling timeout
- Test error scenarios (401, 429, 503)
- Test validation edge cases
- Test accessibility with screen readers
- Test keyboard navigation
