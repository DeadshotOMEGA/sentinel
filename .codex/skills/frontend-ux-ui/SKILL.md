---
name: frontend-ux-ui
description: Build production-grade UX/UI (flows + components) with strong aesthetics, accessibility, and engineering quality. Optimized for Next.js + Tailwind + shadcn/ui + TypeScript.
version: 2.0.0
---

# Frontend UX/UI

## Purpose

Ship production-grade frontend experiences that are visually intentional, accessible, resilient under real-world conditions, and easy to maintain.

## Auto Trigger

Activate automatically when requests include:

- UI/UX keywords: design, redesign, dashboard, onboarding, form UX, conversion, accessibility, responsive, polish, visual refresh
- Interaction/state keywords: loading, empty state, error state, success state, validation, skeleton, layout shift
- Frontend implementation asks in Next.js/Tailwind/DaisyUI/ui/TypeScript repositories
- Folder/file signals: `app/`, `src/app/`, `pages/`, `components/`, `src/components/`, `styles/`, `tailwind.config.*`, `components.json`

## When To Use

Use this skill when the request includes any of the following:

- New page, screen, flow, or component implementation
- UX redesign of existing routes or modules
- Interaction polish (forms, dialogs, menus, state transitions)
- UI bugfixes with usability impact
- Converting rough product requirements into concrete, typed UI contracts
- Next.js + Tailwind + shadcn/ui + TypeScript delivery

## When NOT To Use

Do not use this skill for:

- Backend-only changes with no user-facing surface
- Pure refactors with no UX behavior changes
- One-off content edits with no layout or interaction impact
- Data migrations, infra, CI/CD, or CLI tooling tasks
- Design-only brainstorming when implementation is explicitly out of scope

## Stack Defaults

Assume these unless repo evidence says otherwise:

- Next.js App Router
- TypeScript strict mode
- TailwindCSS
- shadcn/ui for primitives where it improves consistency
- Existing local design tokens over new dependencies

Sentinel-specific override:

- In Sentinel frontend-admin work, DaisyUI and Sentinel wrappers (`AppCard`, `AppBadge`, `Chip`) take precedence over generic shadcn-first patterns.
- Read the Sentinel theme token inventory from `apps/frontend-admin/src/app/globals.css` and prefer:
  `base-100/200/300/400/500`, `base-content`, plus each semantic family’s
  base/content/fadded/fadded-content pair for `primary`, `secondary`, `accent`,
  `neutral`, `info`, `success`, `warning`, and `error`.

## Operating Rules

1. Repo-first, not blank-canvas: inspect the codebase before proposing visuals.
2. LSP/symbol-aware navigation before grep.
3. Minimize churn: edit only the smallest set of files needed.
4. Preserve design system and product language already present.
5. Prefer clear contracts over implicit behavior.

## Required UI States (Enforced)

Every feature and screen must define and implement:

- Loading
- Empty
- Error (recoverable and fatal where applicable)
- Success
- Disabled/pending action states
- Partial/degraded data states

## Non-Negotiables

1. Accessibility: semantic structure, keyboard usability, visible focus, proper names/labels.
2. Responsive behavior: mobile-first and validated on small/medium/large viewports.
3. Stability: avoid layout shift using reserved space/skeletons.
4. Engineering quality: typed props, explicit variants, predictable state transitions.
5. Minimal churn: avoid unrelated rewrites or design-system drift.
6. Verification required: run practical checks before claiming completion.

## Design System Awareness (Must Do)

### Discovery order

1. Use symbol-aware navigation to find route entrypoints, shared layouts, and component ownership.
2. Locate existing tokens, utility classes, and component conventions.
3. Trace data loading and mutation paths for the affected flow.
4. Use grep only for plain-text fallback (copy strings, config values, non-symbol search).

### Minimum context to gather

- Existing visual language (type scale, spacing rhythm, radii, shadows)
- Existing theme token inventory, especially Sentinel DaisyUI semantic/fadded pairs when present
- Existing state patterns (skeletons, inline errors, empty screens)
- Existing accessibility patterns (dialog focus trap, form errors, aria-live usage)
- Existing testing/verification standards in the repo

## Workflow (Must Follow)

Follow this sequence strictly.

### Step 0: Repo-First Discovery (LSP-First)

Establish context before proposing UI changes:

- Confirm route/page ownership and component boundaries.
- Confirm token and spacing/radius/shadow patterns to reuse.
- Confirm data and mutation flows plus async boundaries.
- Use grep only as fallback for non-symbol text lookups.

### Step 1: UX Brief

Produce a short implementation brief before coding:

- User persona and job-to-be-done
- Screen(s) and user goal
- Success criteria (observable outcomes)
- Technical constraints
- Risk list for edge conditions

### Step 2: Information Architecture + States

Define:

- Layout regions and information hierarchy
- Primary interaction paths
- Full states matrix:
  - Loading
  - Empty
  - Error (recoverable / fatal)
  - Success
  - Partial/degraded data

### Step 3: Visual Direction

Commit to concrete visual choices aligned with the repo:

- Typography hierarchy and density
- Spacing cadence
- Surface and border language
- Color and contrast policy
- Motion policy (none/subtle/expressive) with constraints

Rule: describe decisions as implementable tokens/classes, not adjectives.

### Step 4: Component Contracts

For each component or page module define:

- Props and TypeScript types
- Variants and default behavior
- Events/callbacks and side effects
- Accessibility constraints
- State handling rules
- Error boundary/fallback behavior if applicable

### Step 5: File Plan

Create a minimal blast-radius file plan:

- Files to create
- Files to edit
- Files explicitly not touched
- Migration notes if replacing legacy UI

### Step 6: Implementation

Build in small, testable increments:

- Shared primitives first
- Composite sections second
- Wiring and state logic third
- Polish and microcopy last

Implementation guardrails:

- Prefer composition over monolith components.
- Keep class composition readable.
- Reuse existing shadcn/ui patterns when compatible.
- Handle disabled, pending, and failed actions explicitly.

### Step 7: QA Gates

Run all relevant checks before completion.

Required functional QA:

- Keyboard navigation path works end-to-end.
- Focus behavior is deterministic across dialogs/menus/forms.
- Loading/empty/error/success states render correctly.
- Responsive behavior is correct at common breakpoints.
- Long text does not break layout.
- Permission-denied states provide recovery path or explanation.

Required technical QA:

- Type checks pass.
- Lint checks pass.
- Tests for touched behavior pass (or manual script if tests unavailable).

### Step 8: PR Summary

Produce a concise PR-ready summary:

- What changed
- Why this approach
- UX behavior by state
- Accessibility considerations
- Verification evidence
- Risks and follow-ups

## Output Contract

Use this exact required response section order:

1. UX Brief
2. UX States Matrix
3. Visual Direction
4. Component Contracts
5. File Plan
6. Implementation
7. Verification
8. PR Summary

### Commands Rule (No Comment Lines)

Any terminal commands in responses must be paste-ready blocks with no comment lines.

Use this format:

```bash
pnpm typecheck
pnpm lint
pnpm test --filter <scope>
```

## Practical Heuristics To Avoid Generic AI UI

1. Choose one strong structural idea per screen, not many weak flourishes.
2. Make hierarchy obvious in 3 seconds: title, status, primary action.
3. Use purposeful density based on task frequency.
4. Limit visual motifs; repeat them consistently.
5. Prefer high-signal microcopy tied to user outcome.
6. Promote one primary CTA and demote secondary actions.
7. Use motion only to communicate state change or spatial relationship.
8. Keep ornamental styling secondary to readability and speed.

## Edge-Case Playbook

### Long text

- Support wrapping where readability matters.
- Use truncation only where density matters and add access to full value.
- Stress-test with long names, translated strings, and large numbers.

### Slow network

- Show skeletons or reserved space quickly.
- Keep primary actions predictable while data refreshes.
- Distinguish initial load from background refresh.

### Permission constraints

- Separate not-found vs forbidden states.
- Explain why actions are unavailable.
- Provide next best action (request access, contact admin, fallback path).

### Partial failures

- Render available data.
- Isolate failed subsections with local retry.
- Preserve user progress where possible.

## Accessibility Baseline

- Use native elements first.
- Do not add ARIA when semantics already provide meaning.
- Ensure color contrast meets WCAG expectations.
- Preserve visible focus ring and logical tab order.
- Associate errors with fields and announce important async updates.

## Minimal-Churn Rules

- Do not rename/move files without clear benefit.
- Do not replace existing primitives unless current behavior blocks requirements.
- Keep public component APIs backward compatible when possible.
- Separate cosmetic cleanup from behavior changes.

## Verification Checklist

Complete before final response:

- [ ] All target states implemented (loading/empty/error/success)
- [ ] Keyboard path checked manually
- [ ] Responsive breakpoints checked manually
- [ ] Typecheck passed
- [ ] Lint passed
- [ ] Relevant tests passed or manual test script documented
- [ ] No unrelated files changed

## Templates

### UX States Matrix

Use this exact structure:

| State               | Trigger | UI Response | Recovery/Next Action |
| ------------------- | ------- | ----------- | -------------------- |
| Loading             |         |             |                      |
| Empty               |         |             |                      |
| Error (Recoverable) |         |             |                      |
| Error (Fatal)       |         |             |                      |
| Success             |         |             |                      |
| Disabled/Pending    |         |             |                      |
| Partial/Degraded    |         |             |                      |

### PR Summary

Use this exact structure:

### What

-

### Why

-

### UX States Covered

- Loading:
- Empty:
- Error:
- Success:

### Accessibility

-

### Verification

```bash
pnpm typecheck
pnpm lint
pnpm test --filter <scope>
```

### Risks / Follow-Ups

-
