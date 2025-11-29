# ConfirmDialog Component

A reusable confirmation dialog for destructive actions like delete and sign-out.

## Features

✅ **Three Variants**
- `danger` - Red confirm button for destructive actions (e.g., delete)
- `warning` - Amber confirm button for caution (e.g., sign out)
- `neutral` - Primary blue confirm button for informational confirmations

✅ **Accessibility (WCAG AA)**
- `role="dialog"` and `aria-modal="true"`
- `aria-labelledby` pointing to title
- `aria-describedby` pointing to message
- Focus trapped in dialog
- ESC key closes dialog
- Focus returns to trigger element on close
- Initial focus on cancel button (safe default)

✅ **User Experience**
- Modal backdrop (opaque overlay)
- Loading state on confirm button
- Cannot dismiss while loading
- Keyboard accessible
- Icon based on variant (AlertTriangle for danger/warning, Info for neutral)

## Usage

```tsx
import { ConfirmDialog } from '@sentinel/ui';

// Danger variant - delete confirmation
<ConfirmDialog
  isOpen={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  onConfirm={handleDelete}
  title="Delete Member"
  message="Are you sure you want to delete John Smith? This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
/>

// Warning variant - sign out confirmation
<ConfirmDialog
  isOpen={showSignOutConfirm}
  onClose={() => setShowSignOutConfirm(false)}
  onConfirm={handleSignOut}
  title="Sign Out"
  message="Are you sure you want to sign out? You will need to log in again."
  confirmLabel="Sign Out"
  cancelLabel="Stay Signed In"
  variant="warning"
/>

// Neutral variant - informational confirmation
<ConfirmDialog
  isOpen={showUpdateConfirm}
  onClose={() => setShowUpdateConfirm(false)}
  onConfirm={handleUpdate}
  title="Update Information"
  message="This will update the member's contact information. Do you want to continue?"
  confirmLabel="Yes, Update"
  variant="neutral"
  isLoading={isUpdating}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | Controls dialog visibility |
| `onClose` | `() => void` | - | Called when dialog is closed |
| `onConfirm` | `() => void` | - | Called when confirm button is clicked |
| `title` | `string` | - | Dialog title |
| `message` | `string` | - | Confirmation message |
| `confirmLabel` | `string` | `'Confirm'` | Confirm button text |
| `cancelLabel` | `string` | `'Cancel'` | Cancel button text |
| `variant` | `'danger' \| 'warning' \| 'neutral'` | `'neutral'` | Visual variant |
| `isLoading` | `boolean` | `false` | Shows loading spinner on confirm button |

## Implementation Details

### Focus Management
- On open: Focus moves to cancel button (safe default)
- On close: Focus returns to the element that triggered the dialog (handled by HeroUI Modal)
- Focus is trapped within dialog while open

### Variant Styling
- **Danger**: Red button (`colors.danger.DEFAULT`), AlertTriangle icon
- **Warning**: Amber button (`colors.warning.DEFAULT`), AlertTriangle icon
- **Neutral**: Blue button (`colors.primary.DEFAULT`), Info icon

### Button Layout
- Cancel button on left (light variant, less prominent)
- Confirm button on right (colored variant, more prominent)
- Follows common dialog button patterns

### Loading State
- Shows spinner on confirm button
- Disables cancel button
- Prevents dialog dismissal via backdrop or ESC

## Files

- `/home/sauk/projects/sentinel/shared/ui/components/ConfirmDialog.tsx` - Component implementation
- `/home/sauk/projects/sentinel/shared/ui/components/__test__/ConfirmDialog.example.tsx` - Usage examples
- `/home/sauk/projects/sentinel/shared/ui/index.ts` - Exported from main package

## Dependencies

- `@heroui/react` - Modal, Button components
- `lucide-react` - AlertTriangle, Info icons
- `shared/ui/tokens` - Color design tokens
