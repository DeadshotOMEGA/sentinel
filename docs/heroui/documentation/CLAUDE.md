# HeroUI Documentation (MDX Files)

## Purpose

This directory contains **74 official HeroUI documentation files** in MDX format (Markdown + JSX). These are comprehensive guides covering components, customization, frameworks, and getting started.

**Format:** MDX (Markdown with React components)
**Source:** https://heroui.com/docs
**Total Files:** 74 MDX files

---

## Directory Structure

```
documentation/
├── api-references/     # API documentation (2 files)
├── components/         # Component docs (50 files)
├── customization/      # Theming guides (8 files)
├── frameworks/         # Framework integration (5 files)
└── guide/             # Getting started (10 files)
```

---

## Folders

### 1. api-references/ (2 files)

API documentation for HeroUI core functionality.

| File | Topic | Description |
|------|-------|-------------|
| `heroui-provider.mdx` | HeroUIProvider | Global provider configuration, props, theming |
| `cli-api.mdx` | CLI | heroui-cli commands and usage |

**When to Read:**
- Setting up HeroUIProvider in app root
- Configuring global theme or locale
- Using CLI to add components

---

### 2. components/ (50 files)

Comprehensive documentation for all 50 HeroUI components.

#### Forms (15 components)

| Component | File | Primary Use |
|-----------|------|-------------|
| Input | `input.mdx` | Text input fields |
| Textarea | `textarea.mdx` | Multi-line text input |
| Select | `select.mdx` | Dropdown selection |
| Autocomplete | `autocomplete.mdx` | Search with suggestions |
| Checkbox | `checkbox.mdx` | Single checkbox |
| Checkbox Group | `checkbox-group.mdx` | Multiple checkboxes |
| Radio Group | `radio-group.mdx` | Single selection from options |
| Switch | `switch.mdx` | Toggle on/off |
| Slider | `slider.mdx` | Range selector |
| Date Input | `date-input.mdx` | Date text input |
| Date Picker | `date-picker.mdx` | Calendar date picker |
| Date Range Picker | `date-range-picker.mdx` | Date range selection |
| Time Input | `time-input.mdx` | Time selection |
| Number Input | `number-input.mdx` | Numeric input with controls |
| Input OTP | `input-otp.mdx` | One-time password input |
| Form | `form.mdx` | Form validation and submission |

#### Navigation (5 components)

| Component | File | Primary Use |
|-----------|------|-------------|
| Navbar | `navbar.mdx` | Top navigation bar |
| Breadcrumbs | `breadcrumbs.mdx` | Navigation breadcrumb trail |
| Tabs | `tabs.mdx` | Tabbed content sections |
| Link | `link.mdx` | Styled hyperlinks |
| Pagination | `pagination.mdx` | Page navigation |

#### Data Display (9 components)

| Component | File | Primary Use |
|-----------|------|-------------|
| Table | `table.mdx` | Data tables with sorting, pagination |
| Avatar | `avatar.mdx` | User profile pictures |
| Badge | `badge.mdx` | Notification badges, counts |
| Card | `card.mdx` | Content containers |
| Chip | `chip.mdx` | Tags, labels, filters |
| Code | `code.mdx` | Inline code snippets |
| Image | `image.mdx` | Images with loading states |
| Kbd | `kbd.mdx` | Keyboard shortcut display |
| User | `user.mdx` | User profile with avatar and name |

#### Feedback (7 components)

| Component | File | Primary Use |
|-----------|------|-------------|
| Alert | `alert.mdx` | Messages, warnings, errors |
| Circular Progress | `circular-progress.mdx` | Circular loading indicator |
| Progress | `progress.mdx` | Progress bar |
| Spinner | `spinner.mdx` | Loading spinner |
| Skeleton | `skeleton.mdx` | Content loading placeholder |
| Toast | `toast.mdx` | Notification toasts |
| Tooltip | `tooltip.mdx` | Hover tooltips |

#### Overlay (4 components)

| Component | File | Primary Use |
|-----------|------|-------------|
| Modal | `modal.mdx` | Dialog boxes, confirmations |
| Drawer | `drawer.mdx` | Side panels |
| Dropdown | `dropdown.mdx` | Dropdown menus |
| Popover | `popover.mdx` | Popovers |

#### Layout (3 components)

| Component | File | Primary Use |
|-----------|------|-------------|
| Divider | `divider.mdx` | Visual separators |
| Spacer | `spacer.mdx` | Flexible spacing |
| Scroll Shadow | `scroll-shadow.mdx` | Scroll indicators |

#### Other (7 components)

| Component | File | Primary Use |
|-----------|------|-------------|
| Button | `button.mdx` | Action buttons |
| Accordion | `accordion.mdx` | Collapsible sections |
| Calendar | `calendar.mdx` | Date selection UI |
| Range Calendar | `range-calendar.mdx` | Date range selection UI |
| Listbox | `listbox.mdx` | Selectable lists |
| Slider | `slider.mdx` | Range selection |
| Snippet | `snippet.mdx` | Code snippets with copy |

---

### 3. customization/ (8 files)

Theming and styling documentation.

| File | Topic | Description |
|------|-------|-------------|
| `theme.mdx` | Theme Setup | Overview of HeroUI theming system |
| `colors.mdx` | Color System | Semantic colors, color scales, usage |
| `dark-mode.mdx` | Dark Mode | Implementing dark theme |
| `layout.mdx` | Layout Tokens | Spacing, radius, borders, fonts |
| `create-theme.mdx` | Create Theme | Building custom themes from scratch |
| `customize-theme.mdx` | Customize Theme | Extending existing themes |
| `custom-variants.mdx` | Custom Variants | Adding custom component variants |
| `override-styles.mdx` | Override Styles | Component-level style overrides |

**⚠️ IMPORTANT FOR SENTINEL:**
- These docs explain HeroUI theming concepts
- **Always implement changes in `/shared/ui/theme/index.ts`** (Sentinel's canonical theme)
- Use these docs to understand how theming works, not to create new theme configs

---

### 4. frameworks/ (5 files)

Framework integration guides.

| File | Framework | Description |
|------|-----------|-------------|
| `vite.mdx` | Vite | **Sentinel uses Vite** - Setup and configuration |
| `nextjs.mdx` | Next.js | Next.js integration (SSR, app router) |
| `remix.mdx` | Remix | Remix integration |
| `astro.mdx` | Astro | Astro integration |
| `laravel.mdx` | Laravel | Laravel + Inertia.js integration |

**Sentinel Uses Vite:**
- Read `vite.mdx` for relevant setup patterns
- Other framework docs are for reference only

---

### 5. guide/ (10 files)

Getting started documentation.

| File | Topic | Description |
|------|-------|-------------|
| `introduction.mdx` | Introduction | What is HeroUI, FAQ, philosophy |
| `installation.mdx` | Installation | Setup instructions for new projects |
| `cli.mdx` | CLI | Using heroui-cli to add components |
| `design-principles.mdx` | Design Principles | HeroUI's design philosophy |
| `routing.mdx` | Routing | Client-side routing integration |
| `forms.mdx` | Forms | Form handling best practices |
| `tailwind-v4.mdx` | Tailwind v4 | Tailwind CSS v4 migration |
| `figma.mdx` | Figma | Using Figma design kit |
| `nextui-to-heroui.mdx` | Migration | Migrating from NextUI |

---

## How to Read MDX Files

### MDX Format

MDX files combine Markdown with React components:

```mdx
---
title: "Button"
description: "Buttons allow users to perform actions"
---

# Button

Normal markdown content here.

<ComponentLinks component="button" />

## Usage

<CodeDemo title="Basic" files={buttonContent.usage} />

More markdown content.
```

### Reading in Terminal

```bash
# View full documentation
cat documentation/components/button.mdx

# Search for specific content
grep -i "props" documentation/components/button.mdx

# View first 50 lines
head -50 documentation/components/modal.mdx
```

### Reading in VSCode

MDX files render as markdown in VSCode with syntax highlighting. The React components won't render, but you'll see the component names and props.

---

## Common MDX Components in Docs

You'll see these React components in the MDX files:

| Component | Purpose | What to Focus On |
|-----------|---------|------------------|
| `<CodeDemo>` | Interactive examples | Shows code examples (look for file references) |
| `<PackageManagers>` | Installation commands | Installation instructions for npm/yarn/bun |
| `<ComponentLinks>` | Related links | Links to React Aria hooks and related components |
| `<Blockquote>` | Important notes | Warnings, tips, important information |
| `<ImportTabs>` | Import examples | How to import components |

**When reading**, focus on:
1. Markdown text (explanations, descriptions)
2. Code blocks (actual code examples)
3. Component references (tells you which example file to check)

---

## Typical Component Documentation Structure

Each component doc follows this pattern:

```mdx
# Component Name
Description

## Installation
npm/yarn/bun commands

## Import
How to import

## Usage
Basic example

## Props
Component API

### Variant Examples
- Sizes
- Colors
- Variants
- States (disabled, loading, etc.)

## Customization
- Custom styles
- Custom variants

## Accessibility
Keyboard navigation, ARIA attributes

## API
Detailed prop tables
```

---

## Reading Guide for Sentinel Development

### When Implementing a New Component

1. **Read the component doc**: `documentation/components/{component}.mdx`
   - Understand props and variants
   - Note accessibility features

2. **Check code examples**: `../examples/components/{component}/`
   - See actual implementation
   - Understand usage patterns

3. **Adapt for Sentinel**:
   - Use Sentinel's error handling
   - Integrate with Tanstack Query if needed
   - Use canonical theme colors
   - Add proper TypeScript types

### When Customizing Theme

1. **Read customization docs**:
   - `customization/theme.mdx` - Overview
   - `customization/colors.mdx` - Color system
   - `customization/customize-theme.mdx` - Extension patterns

2. **Implement in canonical theme**:
   - Edit `/shared/ui/theme/index.ts`
   - Never create duplicate theme configs

3. **Check examples**:
   - `../examples/customization/` for code samples

---

## Quick Reference

### Most Important Files

**For Component Development:**
1. `components/button.mdx` - Buttons (most used)
2. `components/input.mdx` - Form inputs
3. `components/modal.mdx` - Dialogs
4. `components/table.mdx` - Data tables
5. `components/select.mdx` - Dropdowns

**For Theming:**
1. `customization/theme.mdx` - Theme setup
2. `customization/colors.mdx` - Color system
3. `customization/override-styles.mdx` - Style overrides

**For Setup:**
1. `guide/installation.mdx` - Setup
2. `frameworks/vite.mdx` - Vite integration
3. `api-references/heroui-provider.mdx` - Provider config

---

## Related Documentation

- **Parent Folder**: [../CLAUDE.md](../CLAUDE.md)
- **Code Examples**: [../examples/CLAUDE.md](../examples/CLAUDE.md)
- **Sentinel Theme**: `/shared/ui/theme/index.ts`
- **Sentinel Shared UI**: `/shared/ui/CLAUDE.md`

---

**Total Files**: 74 MDX files
**Components**: 50
**Customization Topics**: 8
**Framework Guides**: 5
**Getting Started Guides**: 10
**Last Updated**: 2026-01-16
