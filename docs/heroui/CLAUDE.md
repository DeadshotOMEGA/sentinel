# HeroUI Documentation & Examples

## Purpose

This directory contains the **official HeroUI documentation and code examples**, organized for easy reference when building UI components in the Sentinel project. It's a local copy of the HeroUI documentation to enable offline access and faster lookups.

**Source:** https://heroui.com
**Documentation Format:** MDX (Markdown + JSX)
**Last Updated:** January 2026

---

## Directory Structure

```
heroui/
├── documentation/          # Official HeroUI documentation (74 MDX files)
│   ├── api-references/     # API documentation (CLI, HeroUIProvider)
│   ├── components/         # Component documentation (50 components)
│   ├── customization/      # Theming and styling guides (8 docs)
│   ├── frameworks/         # Framework integration guides (5 frameworks)
│   └── guide/             # Getting started guides (10 docs)
│
└── examples/               # Code examples from documentation
    ├── components/         # Component usage examples (50 components)
    └── customization/      # Theming and styling examples (5 topics)
```

---

## When Claude Code Should Use These Files

### ✅ DO Reference When:

1. **Learning HeroUI component APIs**
   Read `/documentation/components/{component}.mdx` for props, usage patterns, and best practices

2. **Implementing new HeroUI components**
   Check `/examples/components/{component}/` for working code examples

3. **Customizing theme or styles**
   Reference `/documentation/customization/` for theming approaches
   ⚠️ **BUT** always implement changes in `/shared/ui/theme/index.ts` (Sentinel's canonical theme)

4. **Debugging HeroUI issues**
   Compare your implementation with official examples

5. **Understanding framework integration**
   Check `/documentation/frameworks/vite.mdx` or `/documentation/frameworks/nextjs.mdx` for setup patterns

6. **Looking up installation or setup**
   Reference `/documentation/guide/installation.mdx` or `/documentation/guide/cli.mdx`

### ❌ DO NOT Use For:

1. **Sentinel's theme configuration**
   Use `/shared/ui/theme/index.ts` as the single source of truth

2. **Production component implementation**
   These are examples—adapt them to Sentinel patterns (error handling, state management, etc.)

3. **Copy-paste without understanding**
   Understand the pattern, then integrate with Sentinel architecture

---

## Quick Navigation

### Getting Started
- **Installation**: `documentation/guide/installation.mdx`
- **Introduction**: `documentation/guide/introduction.mdx`
- **CLI Usage**: `documentation/guide/cli.mdx`
- **Routing**: `documentation/guide/routing.mdx`
- **Forms**: `documentation/guide/forms.mdx`

### Theming
- **Theme Overview**: `documentation/customization/theme.mdx`
- **Colors**: `documentation/customization/colors.mdx`
- **Dark Mode**: `documentation/customization/dark-mode.mdx`
- **Custom Variants**: `documentation/customization/custom-variants.mdx`
- **Override Styles**: `documentation/customization/override-styles.mdx`

### API References
- **HeroUIProvider**: `documentation/api-references/heroui-provider.mdx`
- **CLI API**: `documentation/api-references/cli-api.mdx`

### Framework Integration
- **Vite** (Sentinel uses this): `documentation/frameworks/vite.mdx`
- **Next.js**: `documentation/frameworks/nextjs.mdx`
- **Remix**: `documentation/frameworks/remix.mdx`
- **Astro**: `documentation/frameworks/astro.mdx`
- **Laravel**: `documentation/frameworks/laravel.mdx`

---

## How to Use This Documentation

### 1. Reading Documentation Files

Documentation files are in **MDX format** (Markdown with React components):

```bash
# View component documentation
cat docs/heroui/documentation/components/button.mdx

# View theming documentation
cat docs/heroui/documentation/customization/theme.mdx
```

**MDX Components** (you'll see in docs):
- `<CodeDemo>` - Interactive code examples
- `<PackageManagers>` - Installation commands
- `<Blockquote>` - Important notes/warnings
- `<ComponentLinks>` - Links to related docs

### 2. Using Code Examples

Examples are in `.raw.jsx` (actual code) and `.ts` (index) files:

```bash
# List available examples for a component
ls docs/heroui/examples/components/button/

# Read usage example
cat docs/heroui/examples/components/button/usage.raw.jsx
```

**Common Example Types:**
- `usage.raw.jsx` - Basic usage
- `variants.raw.jsx` - Visual variants
- `sizes.raw.jsx` - Size options
- `colors.raw.jsx` - Color variants
- `disabled.raw.jsx` - Disabled state
- `custom-*.raw.jsx` - Custom styling/behavior

### 3. Adapting for Sentinel

```tsx
// ❌ DON'T: Copy examples directly
import {Button} from "@heroui/react";
export default function App() {
  return <Button color="primary">Click me</Button>;
}

// ✅ DO: Adapt to Sentinel patterns
import { Button } from '@heroui/react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';

export function SaveButton({ onSave }: { onSave: () => Promise<void> }) {
  const { showToast } = useToast();
  const mutation = useMutation({
    mutationFn: onSave,
    onSuccess: () => showToast('Saved successfully', 'success'),
    onError: () => showToast('Failed to save', 'error'),
  });

  return (
    <Button
      color="secondary"  // Uses Sentinel's purple theme
      isLoading={mutation.isPending}
      onPress={() => mutation.mutate()}
    >
      Save
    </Button>
  );
}
```

---

## Documentation Overview

### Guide (Getting Started)

| File | Topic | Use When |
|------|-------|----------|
| `introduction.mdx` | What is HeroUI | Understanding library philosophy |
| `installation.mdx` | Setup and installation | Setting up HeroUI in a new app |
| `cli.mdx` | CLI usage | Adding components via CLI |
| `design-principles.mdx` | Design philosophy | Understanding HeroUI's approach |
| `routing.mdx` | Client-side routing | Integrating with React Router |
| `forms.mdx` | Form handling | Building forms with HeroUI |
| `tailwind-v4.mdx` | Tailwind CSS v4 | Upgrading to Tailwind v4 |
| `figma.mdx` | Figma design kit | Using Figma components |
| `nextui-to-heroui.mdx` | Migration guide | Migrating from NextUI |

### Components (50 components)

See [documentation/CLAUDE.md](./documentation/CLAUDE.md) for detailed component reference.

**Categories:**
- **Forms** (15): Input, Select, Checkbox, Radio, Switch, Textarea, Autocomplete, etc.
- **Navigation** (5): Navbar, Tabs, Breadcrumbs, Link, Pagination
- **Data Display** (9): Table, Card, Avatar, Badge, Chip, Code, Image, User, etc.
- **Feedback** (7): Alert, Progress, Spinner, Skeleton, Toast, Tooltip, etc.
- **Overlay** (4): Modal, Drawer, Dropdown, Popover
- **Layout** (3): Divider, Spacer, Scroll Shadow
- **Other** (7): Button, Accordion, Calendar, Listbox, Slider, Snippet, etc.

### Customization (Theming)

| File | Topic | Use When |
|------|-------|----------|
| `theme.mdx` | Theme setup | Understanding HeroUI theming |
| `colors.mdx` | Color system | Learning color token structure |
| `dark-mode.mdx` | Dark mode | Implementing dark theme |
| `layout.mdx` | Layout tokens | Customizing spacing, radius, etc. |
| `create-theme.mdx` | Creating themes | Building custom themes |
| `customize-theme.mdx` | Extending themes | Modifying existing themes |
| `custom-variants.mdx` | Custom variants | Adding new component styles |
| `override-styles.mdx` | Style overrides | Per-component customization |

**⚠️ IMPORTANT**: Sentinel uses `/shared/ui/theme/index.ts` as the canonical theme. Reference these docs to understand HeroUI theming concepts, but implement changes in the canonical theme file.

### API References

| File | Topic | Use When |
|------|-------|----------|
| `heroui-provider.mdx` | HeroUIProvider API | Configuring global settings |
| `cli-api.mdx` | CLI commands | Using heroui-cli |

### Frameworks

| File | Framework | Use When |
|------|-----------|----------|
| `vite.mdx` | Vite | **Sentinel uses Vite** |
| `nextjs.mdx` | Next.js | Reference for SSR patterns |
| `remix.mdx` | Remix | Reference for Remix patterns |
| `astro.mdx` | Astro | Reference for Astro patterns |
| `laravel.mdx` | Laravel | Reference for Laravel integration |

---

## Sentinel Integration

### Current HeroUI Setup

Sentinel has HeroUI configured as follows:

**1. Package Installation**
```json
// All apps have @heroui/react installed
"@heroui/react": "^2.x.x"
```

**2. Canonical Theme**
```typescript
// /shared/ui/theme/index.ts - Single source of truth
export const sentinelTheme = {
  themes: {
    light: {
      colors: {
        secondary: {
          500: "#7828c8",  // Canonical purple
          DEFAULT: "#7828c8",
        },
        // ... full color scales
      },
    },
    dark: { /* ... */ },
  },
};
```

**3. Tailwind Config** (all apps)
```typescript
// Imports canonical theme
import { sentinelTheme, tailwindExtend } from '../shared/ui/theme';

plugins: [heroui(sentinelTheme)],
```

**4. App Entry Points** (main.tsx)
```tsx
// All apps wrap with HeroUIProvider
<HeroUIProvider>
  <main className="light text-foreground bg-background min-h-screen">
    <App />
  </main>
</HeroUIProvider>
```

### Workflow for Using HeroUI Docs

```bash
# 1. Find the component you need
ls docs/heroui/documentation/components/

# 2. Read the documentation
cat docs/heroui/documentation/components/modal.mdx

# 3. Check code examples
ls docs/heroui/examples/components/modal/
cat docs/heroui/examples/components/modal/usage.raw.jsx

# 4. Implement in Sentinel
# - Use patterns from examples
# - Integrate with Sentinel error handling, state management, etc.
# - Use canonical theme colors (designTokens.colors.secondary)
```

---

## File Formats

### MDX Files (.mdx)
- Documentation written in Markdown with JSX components
- Contains explanations, API tables, examples
- Read with any text editor (VSCode, cat, etc.)

### Example Files (.raw.jsx)
- Actual React component code
- Can be copied and adapted for Sentinel
- Typically 10-50 lines of code

### Index Files (.ts)
- Import wrappers for examples
- Used by HeroUI docs website
- Safe to ignore when reading examples

---

## Maintenance

### Updating Documentation

When upgrading HeroUI versions:
1. Check for breaking changes in changelog
2. Update documentation files if API changed
3. Test Sentinel apps with new version
4. Update `/shared/ui/theme/index.ts` if needed

### Adding New Examples

If you create useful HeroUI patterns:
1. Consider adding them to `/shared/ui/components/` as reusable components
2. Document in `/shared/ui/CLAUDE.md`
3. Don't modify this heroui docs folder (it's official documentation)

---

## Related Documentation

- **Sentinel Shared UI**: `/shared/ui/CLAUDE.md`
- **Canonical Theme**: `/shared/ui/theme/index.ts`
- **Documentation Folder**: [documentation/CLAUDE.md](./documentation/CLAUDE.md)
- **Examples Folder**: [examples/CLAUDE.md](./examples/CLAUDE.md)
- **HeroUI Official Website**: https://heroui.com

---

**Total Documentation Files**: 74 MDX files
**Total Components**: 50
**Last Updated**: 2026-01-16
**HeroUI Version**: Check package.json for current version
