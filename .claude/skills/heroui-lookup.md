# HeroUI Component Lookup

Look up detailed documentation for any HeroUI component directly from the source repository.

## Trigger Phrases
- "what props does [component] have"
- "how do I use [component]"
- "show me [component] examples"
- "heroui [component] documentation"

## Workflow

### 1. Identify the Component
Match the user's request to one of the 46 HeroUI components:

**Form Controls:** accordion, autocomplete, button, calendar, checkbox, date-input, date-picker, form, input, input-otp, number-input, radio, select, slider, switch, textarea

**Navigation:** breadcrumbs, dropdown, link, listbox, menu, navbar, pagination, tabs

**Data Display:** avatar, badge, card, chip, code, image, kbd, progress, skeleton, snippet, spinner, table, user

**Overlays & Feedback:** alert, drawer, modal, popover, toast, tooltip

**Layout:** divider, ripple, scroll-shadow, spacer

### 2. Fetch Documentation from GitHub

Use WebFetch to retrieve component information from these URLs:

**Props & TypeScript Interface:**
```
https://raw.githubusercontent.com/heroui-inc/heroui/canary/packages/components/{component}/src/use-{component}.ts
```

**Variant Options (colors, sizes, styles):**
```
https://raw.githubusercontent.com/heroui-inc/heroui/canary/packages/core/theme/src/components/{component}.ts
```

**Usage Examples:**
```
https://raw.githubusercontent.com/heroui-inc/heroui/canary/packages/components/{component}/stories/{component}.stories.tsx
```

### 3. Parse and Present

Extract from the fetched files:
- **Props**: All TypeScript interface properties with types and JSDoc descriptions
- **Variants**: Available colors, sizes, variant styles, radius options
- **Examples**: Real code patterns showing common use cases

### 4. Apply Sentinel Context

When presenting, remind about Sentinel-specific requirements:
- Import from `@heroui/react` (not individual packages)
- Use `onPress` not `onClick` for Button/Link
- Use `isSelected` not `checked` for Checkbox/Switch
- Use `isDisabled` not `disabled`
- Kiosk app requires `size="lg"` + `min-h-[56px]` on interactive elements
- Use semantic colors (`color="primary"`) not hardcoded hex values

## Example Output

```markdown
## Button Component

### Import
\`\`\`tsx
import { Button } from '@heroui/react';
\`\`\`

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| onPress | () => void | - | Click handler (use instead of onClick) |
| color | "default" \| "primary" \| "secondary" \| "success" \| "warning" \| "danger" | "default" | Button color |
| size | "sm" \| "md" \| "lg" | "md" | Button size |
| variant | "solid" \| "bordered" \| "light" \| "flat" \| "faded" \| "shadow" \| "ghost" | "solid" | Visual style |
| isLoading | boolean | false | Show loading spinner |
| isDisabled | boolean | false | Disable the button |
| startContent | ReactNode | - | Content before children |
| endContent | ReactNode | - | Content after children |

### Variants
- **Colors:** default, primary, secondary, success, warning, danger
- **Sizes:** sm (32px), md (40px), lg (48px)
- **Variants:** solid, bordered, light, flat, faded, shadow, ghost
- **Radius:** none, sm, md (default), lg, full

### Usage Example
\`\`\`tsx
<Button
  color="primary"
  size="lg"
  onPress={() => handleSubmit()}
  isLoading={isSubmitting}
>
  Submit
</Button>
\`\`\`

### Sentinel Notes
- For kiosk app, always use `size="lg"` and add `className="min-h-[56px]"`
- Icon-only buttons require `aria-label` for accessibility
```
