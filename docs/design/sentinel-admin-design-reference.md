---
type: reference
title: Sentinel Admin Design Reference
status: active
created: 2026-04-24
last_updated: 2026-04-24
canonical_example: apps/frontend-admin/src/components/settings/system-update-panel.tsx
---

# Sentinel Admin Design Reference

This reference defines how `apps/frontend-admin` admin pages should look and behave. The canonical implementation is the Settings > Updates page, implemented in `apps/frontend-admin/src/components/settings/system-update-panel.tsx`.

Use that page as the visual and interaction standard for future appliance-style admin work: status-first, dense, calm, operational, and obvious under time pressure.

## Product Feel

Sentinel Admin is an appliance control surface, not a SaaS marketing dashboard. It should feel dependable, serious, fast, and difficult to misuse.

The operator should be able to answer these questions within 3 seconds:

- What is the current system state?
- Is there anything wrong?
- What action is available now?
- What details can wait until I ask for them?

The Updates page is the canon because it balances these needs:

- A compact status hero anchors the page.
- KPIs show priority without equal-card monotony.
- Action bars expose what is runnable now.
- Timelines show operational sequence instead of raw process noise.
- Technical detail is available, but secondary.

## Core Principles

### Status First

Every admin page should lead with the current state of the thing being managed.

Good:

- "Sentinel is up to date"
- "Updating to v2.8.3"
- "Network profile needs attention"
- "Database backup failed"

Weak:

- "Updates"
- "System management"
- "Admin tools"
- "Configuration"

Use page titles for navigation context, but make the first visual anchor communicate state.

### Glanceability

A distracted operator should understand the page state and next action within 3 seconds.

That means:

- The most important status is visually dominant.
- The primary action is visible near the status.
- Warnings do not outrank success unless they block the task.
- Details are progressively disclosed.
- Raw technical output is parsed, summarized, filtered, or collapsed.

### Appliance Restraint

Sentinel Admin should feel closer to UniFi, Synology DSM, Proxmox, or pfSense than to a business intelligence dashboard.

Use:

- Compact surfaces
- Strong headings
- Functional icons
- Semantic color
- Mono values for machine data
- Dense layouts with enough spacing to scan

Avoid:

- Decorative gradients
- Heroes that behave like landing pages
- Equal dashboard tiles for unrelated information
- Overly pale boxes everywhere
- Raw terminal output as the primary UI
- Marketing copy

## Page Anatomy

Admin pages should generally follow this structure:

1. Compact status hero
2. Priority KPI region
3. Active process or live operation card, only when relevant
4. Primary content and action region
5. Secondary tools or supporting context
6. Collapsed technical details, logs, trace output, or metadata

Not every page needs every region. Do not add empty structure just to match the Updates page. Use the pattern when it clarifies the operator task.

## Compact Status Hero

The top hero is the page anchor. It is not a marketing hero.

Use DaisyUI `hero` and `hero-content` as the base pattern:

```tsx
<section aria-live="polite" className={`hero rounded-box ${heroSurfaceClasses[heroView.tone]}`}>
  <div className="hero-content w-full flex-col items-stretch justify-between gap-(--space-5) px-(--space-6) py-(--space-5) text-left xl:flex-row xl:items-center">
    <div className="flex min-w-0 items-start gap-(--space-4)">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-box bg-base-100 shadow-[var(--shadow-2)] ring-1 ring-base-content/10">
        {renderIcon(heroView.icon, 'h-8 w-8')}
      </div>
      <div className="min-w-0 space-y-(--space-1)">
        <div className="flex flex-wrap items-center gap-(--space-2)">
          <h1 className="font-display text-4xl font-bold leading-tight text-base-content">
            {heroView.headline}
          </h1>
          <AppBadge status={toneBadgeStatus[heroView.tone]} size="lg">
            {heroView.badge}
          </AppBadge>
        </div>
        <p className="max-w-3xl text-sm font-medium leading-relaxed text-base-content/70">
          {heroView.message}
        </p>
      </div>
    </div>

    <div className="flex shrink-0 flex-wrap items-center justify-end gap-(--space-2) rounded-box bg-base-100/70 p-1.5 shadow-[var(--shadow-1)] xl:ml-auto">
      {/* Primary and secondary actions */}
    </div>
  </div>
</section>
```

Hero rules:

- Use `hero`, `hero-content`, `rounded-box`, and token spacing.
- Do not use `min-h-screen`.
- Do not make the hero full-page.
- Use one dominant `h1`.
- Keep support text short and quieter.
- Group hero actions in a compact action cluster.
- Use `aria-live="polite"` when status can change.
- Let the hero dominate above-the-fold attention.

Hero tones:

```tsx
const heroSurfaceClasses = {
  success:
    'border border-l-4 border-success/35 border-l-success bg-success/10 text-base-content shadow-[var(--shadow-3)]',
  warning:
    'border border-l-4 border-warning/45 border-l-warning bg-warning/15 text-base-content shadow-[var(--shadow-3)]',
  error:
    'border border-l-4 border-error/45 border-l-error bg-error/12 text-base-content shadow-[var(--shadow-3)]',
  info: 'border border-l-4 border-info/40 border-l-info bg-info/12 text-base-content shadow-[var(--shadow-3)]',
}
```

Use semantic color only because the hero communicates state. Do not use semantic color to decorate a neutral page.

## KPI Region

KPIs should not be four equal stat boxes unless the data truly has equal priority. The Updates page uses an asymmetric KPI region:

- Primary KPI: Installed Version
- Strong supporting KPI: System Health
- Secondary KPI: Latest Stable
- Secondary KPI: Last Update Time

KPI rules:

- Values are the visual focal point.
- Labels are small, uppercase, and muted.
- Descriptions are quieter than values.
- Machine values use `font-mono`.
- Cards use subtle surface hierarchy, not heavy outlines everywhere.
- Status badges should not sit on far-right edges if they pull attention away from the metric.

Preferred primary KPI treatment:

```tsx
<div className="rounded-box border-l-4 border-neutral/35 bg-base-200/85 p-(--space-5) shadow-[var(--shadow-2)]">
  <p className="flex items-center gap-(--space-2) text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/55">
    <Tag className="h-4 w-4" />
    Installed version
  </p>
  <p className="mt-(--space-2) break-all font-mono text-5xl font-black leading-none text-base-content">
    v2.8.2
  </p>
  <div className="mt-(--space-2) flex w-fit flex-wrap items-center gap-(--space-2)">
    <AppBadge status="success" size="sm">
      Current
    </AppBadge>
    <span className="text-xs font-medium text-base-content/62">
      Installed Sentinel package/runtime version.
    </span>
  </div>
</div>
```

Preferred healthy status KPI treatment:

```tsx
<div className="rounded-box border-2 border-success/55 bg-base-100 p-(--space-5) text-base-content shadow-[var(--shadow-2)]">
  {/* Health icon, label, value, detail */}
</div>
```

This keeps success visible without flooding the card with green. Use tinted backgrounds for warning, error, and info states when they need stronger attention.

Do not:

- Use DaisyUI `stats` if it recreates four equal boxes.
- Put all badges at the top-right by default.
- Tint every KPI.
- Make passive metadata compete with primary system state.

## Active Process Card

Live operational progress belongs in its own card after KPIs, and only when a process is running.

The Updates page uses a standalone horizontal process card for active upgrades. This separates "where the process is now" from historical timeline and job metadata.

Use when:

- A backend job is active.
- A process has ordered phases.
- The operator needs to know progress at a glance.

Hide when:

- There is no active job.
- The latest job is terminal and belongs in history.
- The process is not meaningful enough to track step-by-step.

Preferred pattern:

```tsx
{
  showLiveProgress && currentJob && (
    <section className="rounded-box bg-base-100 p-(--space-4) shadow-[var(--shadow-2)]">
      <div className="flex flex-wrap items-start justify-between gap-(--space-3) border-b border-base-300/55 pb-(--space-3)">
        <div>
          <h2 className="text-lg font-bold text-base-content">Upgrade process</h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-base-content/55">
            Live host-side progress for {currentJob.targetVersion}.
          </p>
        </div>
        <AppBadge status="info" size="sm">
          {currentJob.phase.label}
        </AppBadge>
      </div>

      <div className="overflow-x-auto py-(--space-3)">
        <ul className="steps steps-horizontal w-full">{/* phase steps */}</ul>
      </div>

      <div className="rounded-box bg-info/10 px-(--space-3) py-(--space-2) text-sm text-base-content shadow-inner">
        {/* active checkpoint */}
      </div>
    </section>
  )
}
```

Rules:

- Use DaisyUI `steps steps-horizontal` for ordered live process steps.
- Do not duplicate the live process inside collapsed job details.
- Keep technical job identifiers in details, not in the process card.
- Let the active checkpoint be readable in one line when possible.
- Preserve horizontal overflow resilience with wrapping or scroll containment where necessary.

## Operational Timeline

Use timelines for event history, not live phase progress. The Updates page has both:

- Active process card: current phase.
- Update activity timeline: meaningful milestones.

Timeline rules:

- Show the most meaningful 3-5 milestones by default.
- Compress vertical density.
- Use timestamps, icons, and titles consistently.
- Keep detail text short.
- Put full technical progression in logs or collapsed details.

Preferred density:

```tsx
<ul className="timeline timeline-vertical timeline-compact mt-1">
  <li className="min-h-0">
    <div className="timeline-start min-w-20 pr-(--space-2) pt-0 text-right font-mono text-[0.68rem] font-semibold leading-tight text-base-content/65">
      Apr 23, 04:10 PM
    </div>
    <div className="timeline-middle">
      <div className="grid h-4 w-4 place-items-center rounded-full ring-2 bg-info ring-info/25" />
    </div>
    <div className="timeline-end w-full min-w-0 pb-0 pl-(--space-2)">
      <div className="w-full rounded-box bg-base-200/65 px-(--space-2) py-0.5">
        <p className="text-sm font-bold leading-tight text-base-content">Updater started</p>
        <p className="mt-0.5 text-xs font-medium leading-snug text-base-content/68">
          The host appliance updater accepted the request.
        </p>
      </div>
    </div>
  </li>
</ul>
```

Do not:

- Turn every log line into a milestone.
- Use tall receipt-like cards for each timeline item.
- Let timestamps dominate the content.
- Mix live progress and completed history in one visual language.

## Action Bars

Action bars show what the operator can do now.

The Updates page Recovery Tools panel is the reference:

- Active action: `Repair hotspot`
- Future actions: `Backup now`, `Rollback`, `Export DB`
- Disabled future actions are real disabled buttons with nearby explanatory text.

Rules:

- Use buttons for commands, not explanatory cards.
- Keep disabled future actions visibly disabled.
- Do not create clickable dead boxes.
- Group related actions in a compact surface.
- Pair unavailable tools with concise plain-language explanation.

Preferred pattern:

```tsx
<div className="flex flex-wrap gap-(--space-2) rounded-box bg-base-200/75 p-(--space-2)">
  <button type="button" className="btn btn-sm btn-primary shadow-sm">
    <ShieldCheck className="mr-2 h-4 w-4" />
    Repair hotspot
  </button>
  <button
    type="button"
    className="btn btn-sm border-base-300 bg-base-100 text-base-content/45"
    disabled
  >
    <Database className="mr-2 h-4 w-4" />
    Backup now
  </button>
</div>
```

## Technical Details and Logs

Technical diagnostics should be available without becoming the main page.

The Updates page trace log is the reference for upgrading raw output into an event viewer:

- Default summary tab
- Raw tab for full stream review
- Search and severity filters
- Severity badges
- Filtered noisy progress lines
- Collapsible diagnostic payloads
- Raw log download
- Collapsed by default when not immediately needed

Trace/log rules:

- Do not embed a raw text file as the primary UI.
- Parse obvious structure into rows when possible.
- De-emphasize repeated metadata.
- Use time, severity, source, and message as separate concepts.
- Filter display noise without changing the underlying log.
- Collapse JSON payloads or large diagnostic blocks.
- Keep raw output accessible.

Collapsed technical sections should still look intentional:

```tsx
<summary className="collapse-title rounded-box border-l-4 border-neutral/35 bg-base-200/75 pr-(--space-12) shadow-[var(--shadow-1)]">
  <h3 className="flex items-center gap-(--space-2) text-lg font-bold text-base-content">
    <span className="grid h-8 w-8 place-items-center rounded-box bg-base-100 shadow-[var(--shadow-1)]">
      <Terminal className="h-4 w-4 text-base-content/75" />
    </span>
    Update trace log
  </h3>
</summary>
```

## Surface Hierarchy

Avoid "white rectangle fatigue." Not every group deserves the same card treatment.

Use these surface levels:

| Level             | Treatment                                  | Use                        |
| ----------------- | ------------------------------------------ | -------------------------- |
| Page shell        | `bg-base-300/35` or route background       | Holds the page composition |
| Hero              | semantic tinted surface with strong shadow | Primary status             |
| Primary KPI       | `bg-base-200/85`, left accent, shadow 2    | Most important metric      |
| Status KPI        | semantic outline or tint, shadow 2         | Health or blocker state    |
| Secondary KPI     | `bg-base-100`, shadow 1                    | Passive metadata           |
| Main content card | `bg-base-100`, shadow 2                    | Timeline, tools, logs      |
| Grouped controls  | `bg-base-200/75`, token padding            | Button/action clusters     |
| Technical detail  | collapse with stronger header              | Logs, IDs, paths           |

Rules:

- Prefer whitespace and typography before adding borders.
- Borders should have a reason: semantic state, grouping, or separation.
- Avoid nested cards.
- Avoid every section having the same pale background.
- Use `shadow-[var(--shadow-1)]` and `shadow-[var(--shadow-2)]` deliberately.

## Typography

Typography should do most of the hierarchy work.

Use:

- `font-display` for page hero `h1` and major h2 headings.
- `text-4xl font-bold` for hero status headlines.
- `text-lg font-bold` for section titles.
- `text-[0.68rem] uppercase tracking-wide` for KPI labels.
- `font-mono` for versions, timestamps, job IDs, paths, trace lines, and machine values.
- `text-base-content/55` to `/70` for metadata depending on importance.

Do not:

- Use hero-scale type inside small cards.
- Make labels visually compete with values.
- Use low-contrast grey for critical text.
- Use all caps for prose.

## Icons

Icons are scan aids, not decoration.

Use lucide icons when available:

| Concept         | Icon                                      |
| --------------- | ----------------------------------------- |
| Version         | `Tag`                                     |
| Health          | `ShieldCheck`, `TriangleAlert`, `CircleX` |
| Backup/database | `Database`                                |
| Logs/terminal   | `Terminal`                                |
| Rollback        | `RotateCcw`                               |
| Download/update | `Download`                                |
| Time            | `Clock3`                                  |
| Refresh         | `RefreshCw`                               |

Rules:

- Pair icons with labels in admin surfaces.
- Keep icon size consistent within a region.
- Do not use icons as decorative background art.
- Use badges for status text, not icons alone.

## Color Semantics

Use semantic colors only for meaning:

| Color         | Meaning                                | Example                      |
| ------------- | -------------------------------------- | ---------------------------- |
| Green/success | Healthy, complete, current             | Up to date, database healthy |
| Amber/warning | Needs attention, degraded, recoverable | Hotspot warning              |
| Red/error     | Failed, blocked, unsafe                | Update failed                |
| Blue/info     | In progress, available, informational  | Update running               |
| Grey/neutral  | Archived, disabled, passive            | Future tools                 |

Important nuance:

- A non-blocking warning should not visually override a successful primary task.
- Healthy status can use an outline instead of a filled green surface.
- Do not tint multiple neighboring cards with the same color unless their states require it.
- Prefer neutral surfaces for passive metadata.

## Progressive Disclosure

Keep primary actions visible and details available.

Use DaisyUI `collapse` for:

- Job details
- Technical metadata
- Raw logs
- Diagnostic payloads
- Optional advanced controls

Do not collapse:

- The primary status
- The primary action
- Active blockers
- Required form inputs

## State Requirements

Admin pages should account for:

- Loading
- Empty/idle
- Success/current
- Available action
- Active process
- Completed process
- Failed process
- Partial/degraded data
- Non-admin or disabled action
- Recoverable query errors
- Fatal data errors

The Updates page handles these through:

- Hero view helpers
- KPI view helpers
- Timeline view helpers
- Disabled button states
- AppAlert warnings and errors
- Collapsed technical detail

Prefer typed view helpers in `*.logic.ts` for derived display states. Keep rendering code focused on layout and component composition.

## Component Contracts

For complex admin pages, extract typed display helpers:

```tsx
getPageHeroView(input)
getPrimaryKpiView(input)
getHealthKpiView(input)
getTimelineItems(input)
getTraceDisplay(input)
```

Helpers should return display-ready objects:

- `tone`
- `icon`
- `headline`
- `message`
- `badge`
- `value`
- `label`
- `detail`
- `timestamp`
- `primaryActionIntent`

This keeps rendering deterministic and makes state coverage testable.

## DaisyUI and Sentinel Components

Use DaisyUI first, then Sentinel wrappers where they encode standards.

Use DaisyUI patterns for:

- `hero`
- `btn`
- `badge` through `AppBadge`
- `alert` through `AppAlert`
- `collapse`
- `timeline`
- `steps`
- `loading`
- `tabs`
- `select`
- `input`

Use Sentinel wrappers for:

- `AppCard` for standard content containers
- `AppBadge` for status indicators
- `AppAlert` for semantic warnings/errors/info
- `Dialog` primitives for modals
- `LoadingSpinner` for project-consistent spinners

Do not rebuild DaisyUI primitives unless the existing project pattern requires it.

## Responsive Behavior

`apps/frontend-admin` is desktop-first, but layouts still need overflow resilience.

Rules:

- Use `min-w-0` on grid children that contain text.
- Let action groups `flex-wrap`.
- Avoid fixed widths that cause horizontal scroll.
- Use `overflow-x-auto` only for intentionally horizontal structures such as steps.
- Buttons should wrap predictably.
- Long paths, job IDs, and versions should `break-all` or be constrained.

Verification target remains `1920x1080` unless the product requirement changes.

## Accessibility

Admin polish must not hide accessibility requirements.

Rules:

- Hero status changes use `aria-live="polite"` when dynamic.
- Use real disabled buttons for disabled actions.
- Disabled controls need nearby reason text.
- Timeline entries must have readable text, not color-only meaning.
- Logs and trace rows must preserve raw access or clear text alternatives.
- Buttons need visible labels, not icon-only controls, unless the icon is universally clear and tooltip support exists.
- Modals use existing `Dialog` primitives.

## Verification Standard

For admin page work:

1. Run focused tests for logic helpers.
2. Run `pnpm --filter frontend-admin typecheck`.
3. Run `pnpm --filter frontend-admin lint` when practical.
4. Run `git diff --check`.
5. Use `playwright-cli` at `1920x1080` when layout or visual hierarchy changed.

Visual sanity should inspect:

- No horizontal overflow.
- Hero remains dominant.
- KPI values are visually primary.
- Badges do not pull the eye away from key data.
- Warnings are secondary unless blocking.
- Disabled actions are obvious.
- Collapsed details look intentional.
- Trace/log areas do not read like pasted terminal output.

## Implementation Checklist

Before marking an admin page complete, verify:

- [ ] The first visual anchor communicates system state.
- [ ] The primary action is visible and close to the status.
- [ ] KPIs are asymmetric when priority differs.
- [ ] Values are stronger than labels.
- [ ] Machine values use mono type.
- [ ] Semantic colors have semantic meaning.
- [ ] Healthy states do not over-tint the page.
- [ ] Warnings do not override unrelated success states.
- [ ] Active processes have dedicated progress treatment.
- [ ] Historical activity uses a compact timeline.
- [ ] Recovery/admin tools are actions, not passive cards.
- [ ] Future tools are disabled buttons with reason text.
- [ ] Logs are summarized or structured by default.
- [ ] Raw logs remain accessible.
- [ ] Details and metadata are collapsed when secondary.
- [ ] No nested cards.
- [ ] No equal-card fatigue.
- [ ] No marketing hero patterns.
- [ ] No horizontal overflow at `1920x1080`.

## Anti-Patterns

Avoid these patterns in Sentinel Admin:

- A generic page title as the dominant element.
- Four equal KPI/stat boxes for mixed-priority data.
- Badges parked on far-right card edges when they compete with neighboring cards.
- Green backgrounds on every healthy card.
- Repeated pale panels with identical weight.
- Passive roadmap cards for unavailable actions.
- Raw log text as the main diagnostic UI.
- Long explanatory paragraphs inside operational panels.
- Decorative color, decorative icons, or decorative motion.
- Full-screen hero sections.
- Nested cards.
- Unstructured metadata walls.

## Canon Summary

The Updates page establishes the standard:

- Compact DaisyUI hero for state.
- Asymmetric KPI region for priority.
- Dedicated horizontal process card only during active work.
- Compact activity timeline for meaningful history.
- Recovery tools as an action bar.
- Structured trace log instead of raw terminal paste.
- Neutral surface hierarchy with restrained semantic color.
- Typed logic helpers for display state.
- Dense, serious, operational UI that lets the operator act quickly.

Future Sentinel Admin pages should follow this spirit even when the exact sections differ.
