# HeroUI Code Examples

## Purpose

This directory contains **actual working code examples** from the official HeroUI documentation. These are `.raw.jsx` files showing real implementations of HeroUI components and customization patterns.

**Format:** JSX/TSX code files
**Source:** https://heroui.com/docs
**Total Components**: 50+ components with examples

---

## Directory Structure

```
examples/
├── components/         # Component usage examples (50+ folders)
│   ├── button/        # Button examples
│   ├── modal/         # Modal examples
│   ├── input/         # Input examples
│   └── ...            # (50 total)
└── customization/      # Theming examples (5 folders)
    ├── colors/        # Color customization
    ├── create-theme/  # Creating themes
    ├── customize-theme/ # Extending themes
    ├── custom-variants/ # Custom variants
    └── override-styles/ # Style overrides
```

---

## File Types

### .raw.jsx Files
**Actual React component code** - These are the real examples you can copy and adapt.

```jsx
// Example: button/usage.raw.jsx
import {Button} from "@heroui/react";

export default function App() {
  return <Button color="primary">Button</Button>;
}
```

### .ts Files
**Index files** that import the `.raw.jsx` files. Used by HeroUI docs website. Safe to ignore when reading examples.

```typescript
// Example: button/usage.ts
import App from "./usage.raw.jsx?raw";

const react = {
  "/App.jsx": App,
};

export default {
  ...react,
};
```

**Focus on `.raw.jsx` files** - they contain the actual code.

---

## Component Examples

### Common Example Types

Each component folder typically contains these example types:

| File Pattern | Description | Shows |
|--------------|-------------|-------|
| `usage.raw.jsx` | Basic usage | Simplest implementation |
| `variants.raw.jsx` | Visual variants | solid, bordered, light, flat, faded, shadow, ghost |
| `sizes.raw.jsx` | Size options | sm, md, lg, xl |
| `colors.raw.jsx` | Color variants | primary, secondary, success, warning, danger |
| `disabled.raw.jsx` | Disabled state | Disabled UI state |
| `controlled.raw.jsx` | Controlled component | State management pattern |
| `custom-*.raw.jsx` | Custom examples | Custom styling, behavior, etc. |

### Example: Button Component

```bash
ls examples/components/button/
```

**Output:**
```
colors.raw.jsx          # Color variants
custom-impl.raw.jsx     # Custom implementation
custom-styles.raw.jsx   # Custom styling
disabled.raw.jsx        # Disabled state
group.raw.jsx          # Button groups
icons.raw.jsx          # Buttons with icons
loading.raw.jsx        # Loading state
radius.raw.jsx         # Border radius options
sizes.raw.jsx          # Size variants
variants.raw.jsx       # Visual variants
usage.raw.jsx          # Basic usage
```

---

## How to Use Examples

### 1. Finding Examples

```bash
# List all component example folders
ls examples/components/

# List examples for a specific component
ls examples/components/modal/

# Read a specific example
cat examples/components/modal/usage.raw.jsx
```

### 2. Reading Examples

```jsx
// examples/components/modal/usage.raw.jsx
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@heroui/react";

export default function App() {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  return (
    <>
      <Button onPress={onOpen}>Open Modal</Button>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Modal Title</ModalHeader>
              <ModalBody>
                <p>Modal content here.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={onClose}>
                  Confirm
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
```

### 3. Adapting for Sentinel

```tsx
// ❌ DON'T: Copy directly
export default function App() {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  return <Modal isOpen={isOpen} onOpenChange={onOpenChange}>...</Modal>;
}

// ✅ DO: Adapt to Sentinel patterns
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemName: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, itemName }: DeleteConfirmModalProps) {
  const mutation = useMutation({
    mutationFn: onConfirm,
    onSuccess: () => {
      onClose();
      // Show toast notification
    },
    onError: (error) => {
      // Handle error
    },
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Delete {itemName}?</ModalHeader>
            <ModalBody>
              <p>This action cannot be undone.</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} isDisabled={mutation.isPending}>
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={() => mutation.mutate()}
                isLoading={mutation.isPending}
              >
                Delete
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
```

**Sentinel Adaptations:**
1. ✅ Add TypeScript types
2. ✅ Integrate with Tanstack Query for async operations
3. ✅ Add error handling
4. ✅ Use Sentinel's toast notifications
5. ✅ Follow Sentinel naming conventions
6. ✅ Use canonical theme colors

---

## Component Examples Catalog

### Forms (15 components)

| Component | Folder | Key Examples |
|-----------|--------|--------------|
| Button | `button/` | usage, variants, loading, icons, sizes, colors |
| Input | `input/` | usage, variants, validation, icons, controlled |
| Textarea | `textarea/` | usage, autosize, variants, validation |
| Select | `select/` | usage, multiple, validation, async |
| Autocomplete | `autocomplete/` | usage, async, custom-items, validation |
| Checkbox | `checkbox/` | usage, variants, controlled, disabled |
| Checkbox Group | `checkbox-group/` | usage, controlled, validation, custom |
| Radio Group | `radio-group/` | usage, controlled, validation, custom |
| Switch | `switch/` | usage, controlled, colors, sizes |
| Slider | `slider/` | usage, range, marks, custom-value |
| Date Input | `date-input/` | usage, variants, validation |
| Date Picker | `date-picker/` | usage, variants, time-zones, presets |
| Date Range Picker | `date-range-picker/` | usage, presets, validation |
| Time Input | `time-input/` | usage, variants, validation |
| Number Input | `number-input/` | usage, min-max, step, custom-format |

### Navigation (5 components)

| Component | Folder | Key Examples |
|-----------|--------|--------------|
| Navbar | `navbar/` | usage, menu, search, custom-content |
| Breadcrumbs | `breadcrumbs/` | usage, variants, custom-separator |
| Tabs | `tabs/` | usage, variants, controlled, dynamic |
| Link | `link/` | usage, external, block, custom-styles |
| Pagination | `pagination/` | usage, controlled, variants, siblings |

### Data Display (9 components)

| Component | Folder | Key Examples |
|-----------|--------|--------------|
| Table | `table/` | usage, sorting, selection, pagination, async |
| Avatar | `avatar/` | usage, sizes, groups, fallback |
| Badge | `badge/` | usage, variants, placement, content |
| Card | `card/` | usage, variants, cover-image, footer |
| Chip | `chip/` | usage, variants, closeable, avatar |
| Code | `code/` | usage, variants, sizes |
| Image | `image/` | usage, fallback, skeleton, zoom |
| Kbd | `kbd/` | usage, variants, combinations |
| User | `user/` | usage, variants, custom-content |

### Feedback (7 components)

| Component | Folder | Key Examples |
|-----------|--------|--------------|
| Alert | `alert/` | usage, variants, closeable, custom-icon |
| Circular Progress | `circular-progress/` | usage, colors, labels, custom-value |
| Progress | `progress/` | usage, colors, striped, indeterminate |
| Spinner | `spinner/` | usage, colors, sizes |
| Skeleton | `skeleton/` | usage, variants, loaded-state |
| Toast | `toast/` | usage, variants, position, custom |
| Tooltip | `tooltip/` | usage, placement, colors, custom-content |

### Overlay (4 components)

| Component | Folder | Key Examples |
|-----------|--------|--------------|
| Modal | `modal/` | usage, sizes, placement, backdrop, form |
| Drawer | `drawer/` | usage, placement, sizes, backdrop |
| Dropdown | `dropdown/` | usage, variants, sections, custom-trigger |
| Popover | `popover/` | usage, placement, custom-content |

### Layout (3 components)

| Component | Folder | Key Examples |
|-----------|--------|--------------|
| Divider | `divider/` | usage, orientation, custom-content |
| Spacer | `spacer/` | usage, x-y-spacing |
| Scroll Shadow | `scroll-shadow/` | usage, orientation, offset |

### Other (7 components)

| Component | Folder | Key Examples |
|-----------|--------|--------------|
| Accordion | `accordion/` | usage, variants, multiple, controlled |
| Calendar | `calendar/` | usage, variants, range-selection |
| Range Calendar | `range-calendar/` | usage, variants, presets |
| Listbox | `listbox/` | usage, sections, variants, selection |
| Snippet | `snippet/` | usage, variants, copy-button |
| Form | `form/` | usage, validation, custom-validation |
| Input OTP | `input-otp/` | usage, variants, validation |

---

## Customization Examples

Located in `examples/customization/`:

### 1. colors/

Examples for working with the color system.

**Files:**
- `semantic-colors.ts` - Using semantic colors (primary, secondary, etc.)

**Usage:**
```tsx
// Using semantic colors from theme
<div className="bg-primary-500 text-primary-50">
  Primary color box
</div>
```

### 2. create-theme/

Examples for creating custom themes from scratch.

**⚠️ For Sentinel**: Reference only. Use `/shared/ui/theme/index.ts` for theme changes.

### 3. customize-theme/

Examples for extending existing themes.

**Files:**
- `custom-colors.ts` - Adding custom colors
- `custom-layout.ts` - Modifying layout tokens

**Sentinel Pattern:**
```typescript
// Edit /shared/ui/theme/index.ts instead
export const sentinelTheme = {
  themes: {
    light: {
      colors: {
        // Custom colors here
      },
      layout: {
        // Custom layout tokens
      },
    },
  },
};
```

### 4. custom-variants/

Examples for adding custom component variants.

**Example:**
```tsx
import { extendVariants, Button } from "@heroui/react";

const MyButton = extendVariants(Button, {
  variants: {
    color: {
      olive: "text-[#000] bg-[#84cc16]",
      orange: "bg-[#ff8c00] text-[#fff]",
    },
  },
});
```

### 5. override-styles/

Examples for component-level style overrides using className and classNames props.

**Example:**
```tsx
<Button className="rounded-[4px] bg-[#BEF264] text-[#000000]">
  Custom Styled
</Button>

<Input
  classNames={{
    label: "text-black/50",
    input: ["bg-transparent", "text-black/90"],
    inputWrapper: ["shadow-xl", "bg-default-200/50"],
  }}
/>
```

---

## Best Practices for Using Examples

### DO ✅

1. **Read examples to understand patterns**
   ```bash
   cat examples/components/button/usage.raw.jsx
   ```

2. **Check multiple examples for a component**
   ```bash
   ls examples/components/modal/
   # Read usage, sizes, custom-styles, etc.
   ```

3. **Adapt code to Sentinel patterns**
   - Add TypeScript types
   - Integrate with Tanstack Query
   - Use canonical theme colors
   - Add error handling

4. **Reference documentation alongside examples**
   - Read `documentation/components/button.mdx` for props
   - Check `examples/components/button/` for code

### DON'T ❌

1. **Don't copy-paste without understanding**
   - Understand what the code does
   - Know why it's structured that way

2. **Don't ignore TypeScript**
   - Examples are JSX, but Sentinel uses TypeScript
   - Add proper types to all adapted code

3. **Don't create duplicate themes**
   - Examples show theme creation
   - Sentinel has ONE canonical theme at `/shared/ui/theme/index.ts`

4. **Don't skip error handling**
   - Examples show happy path
   - Add try/catch, error states, loading states

---

## Quick Reference

### Most Used Examples

**Components:**
1. `components/button/` - Buttons (most common)
2. `components/input/` - Form inputs
3. `components/modal/` - Dialogs
4. `components/select/` - Dropdowns
5. `components/table/` - Data tables

**Customization:**
1. `customization/colors/` - Color usage
2. `customization/override-styles/` - Style overrides
3. `customization/custom-variants/` - Custom variants

### Files to Check First

When learning a component:
1. `usage.raw.jsx` - Basic usage
2. `variants.raw.jsx` - Available styles
3. `controlled.raw.jsx` - Form integration (for form components)
4. `custom-styles.raw.jsx` - Customization examples

---

## Workflow

```bash
# 1. Find component examples
ls examples/components/modal/

# 2. Read basic usage
cat examples/components/modal/usage.raw.jsx

# 3. Check variants
cat examples/components/modal/variants.raw.jsx

# 4. Check customization
cat examples/components/modal/custom-styles.raw.jsx

# 5. Read documentation for full API
cat documentation/components/modal.mdx

# 6. Implement in Sentinel with adaptations
# - Add TypeScript types
# - Integrate with Tanstack Query
# - Add error handling
# - Use canonical theme colors
```

---

## Related Documentation

- **Parent Folder**: [../CLAUDE.md](../CLAUDE.md)
- **Documentation**: [../documentation/CLAUDE.md](../documentation/CLAUDE.md)
- **Sentinel Theme**: `/shared/ui/theme/index.ts`
- **Sentinel Shared UI**: `/shared/ui/CLAUDE.md`

---

**Total Component Folders**: 50+
**Total Example Files**: 300+ `.raw.jsx` files
**Customization Topics**: 5
**Last Updated**: 2026-01-16
