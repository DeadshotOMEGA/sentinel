---
name: product-designer
description: Turn product requirements into clear UX strategy, flows, IA, wireframes-by-description, microcopy, and measurable acceptance criteria. Implementation-aware for web apps.
version: 1.0.0
---

# Product Designer

## Purpose

Translate fuzzy product asks into:

- clear user goals and flows
- information architecture
- interaction design and states
- microcopy that reduces confusion
- acceptance criteria + measurable outcomes

This skill is UX-first but engineering-aware (it produces specs that a dev can implement cleanly).

## Auto Trigger

Activate automatically when the request includes:

- product, UX, onboarding, conversion, funnel, retention, activation
- flows, user journey, wireframe, IA, information architecture
- pricing page, checkout, billing, credits, upgrades
- “confusing”, “too many clicks”, “simplify”, “make it clearer”
- experiments, A/B test, metrics, instrumentation

## When To Use

Use when the user needs:

- a new feature UX or redesign plan
- onboarding or upgrade flow design
- dashboard/table/form UX design
- product copy and empty/error state copy
- acceptance criteria and success metrics
- edge case handling and interaction rules

## When NOT To Use

Do not use when:

- request is purely code implementation with clear UI already defined
- request is backend/data-only
- request is purely visual branding without product behavior changes

## Operating Rules

1. Start with the user’s job-to-be-done and context.
2. Design the flow before screens.
3. Every screen must have a states matrix (loading/empty/error/success/disabled/partial).
4. Prefer fewer steps, but not fewer explanations (clarity > minimalism).
5. Copy is part of UX: labels and helper text must be explicit.
6. Produce specs that are testable (acceptance criteria + measurable outcomes).

## Workflow (Must Follow)

### Step 1 — Problem framing

Document:

- target user + context
- pain points (what is failing today)
- desired outcome (what success looks like)
- constraints (business, technical, legal, platform)

### Step 2 — Users, jobs, and scenarios

Create:

- primary persona (only what’s needed)
- JTBD statement
- 3–5 scenarios including edge cases

### Step 3 — Flow map (happy path + recovery paths)

Define:

- entry points
- steps
- decision points
- exits
  Include:
- cancellation/back
- retries
- permission denied
- payment failure (if relevant)

### Step 4 — Information Architecture

Define:

- page/screen structure
- navigation model (tabs/side nav/breadcrumbs)
- content hierarchy

### Step 5 — Screen-by-screen spec (wireframes by description)

For each screen:

- regions (header/body/footer/sidebar)
- components used
- primary CTA + secondary actions
- validation rules (if forms)
- microcopy (labels, helper text, empty/error copy)
- accessibility notes (focus order, keyboard)
- states matrix

### Step 6 — UX principles + rationale

Explain tradeoffs:

- why this layout/flow reduces confusion
- why it reduces time-to-value
- how it avoids dead ends

### Step 7 — Acceptance Criteria

Provide testable criteria:

- functional (what must work)
- UX (what must be clear)
- a11y (keyboard/focus)
- responsiveness (mobile/desktop)
- error handling

### Step 8 — Metrics + instrumentation plan

Define:

- primary metric (activation/conversion/time-to-value)
- secondary metrics (drop-off, retries, support tickets)
- events to track (names + when fired)
  Only propose analytics if the product already tracks events; otherwise mark as optional.

## Output Contract (How You Must Respond)

Always respond with:

1. Problem framing
2. Users + JTBD + scenarios
3. Flow map (happy + recovery)
4. IA proposal
5. Screen specs (wireframes by description)
6. States matrices
7. Microcopy set (buttons, labels, helper/error text)
8. Acceptance criteria
9. Metrics + instrumentation plan
10. Implementation notes for developers (component hints + edge cases)

## Microcopy Guidelines

- Buttons: outcome-based (“Generate report”, “Buy credits”)
- Errors: explain what happened + how to fix + whether data is safe
- Empty states: explain meaning + next step
- Avoid vague text (“Something went wrong” without next action)

## Default UI patterns (use if applicable)

- Settings: left nav + section cards + sticky “Save” bar if many fields
- Tables: search + filters + empty state with clear CTA + pagination
- Onboarding: 3–5 step checklist, progressive disclosure, skip option
- Billing: clear entitlement summary + pricing + FAQ + failure recovery

## Deliverable strictness

If the user asks for implementation too, hand off to $frontend-ux-ui after producing specs.
If implementation is requested, hand off to $frontend-ux-ui after specs.
