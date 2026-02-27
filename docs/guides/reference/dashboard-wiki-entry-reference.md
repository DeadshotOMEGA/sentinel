---
type: reference
title: 'Dashboard Wiki Entry Reference'
status: draft
created: 2026-02-27
last_updated: 2026-02-27
ai:
  priority: high
  context_load: on-demand
  triggers:
    - dashboard
    - wiki
    - help
    - slug
  token_budget: 1200
version: 'v1'
stability: stable
related_refs:
  - docs/guides/reference/wiki-rollout-plan.md
  - docs/guides/reference/wiki-slug-index.json
---

# Dashboard Wiki Entry Reference

## Scope

| Field               | Value                                               |
| ------------------- | --------------------------------------------------- |
| Product             | Sentinel Frontend Admin                             |
| Route               | `/dashboard`                                        |
| Canonical help slug | `operations/dashboard/overview`                     |
| Audience            | Day Duty staff, duty supervisors, operations admins |
| Link target policy  | Appliance-only (`http://sentinel.local/dashboard`)  |

## Required Page Set (Initial Delivery)

| Page slug                                    | Page title                  | Purpose                                                           |
| -------------------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| `operations/dashboard/overview`              | Dashboard Overview          | Entry point, section map, escalation order                        |
| `operations/dashboard/security-alerts`       | Security Alerts             | Alert types, severity response order, acknowledgement rules       |
| `operations/dashboard/quick-actions`         | Quick Actions               | Guardrails for check-in/sign-in/lockup actions                    |
| `operations/dashboard/status-panel`          | Status Panel                | Interpretation of DDS, Duty Watch, Building, Lockup Holder blocks |
| `operations/dashboard/presence-grid`         | Presence Grid               | Presence verification, filters, visitor/member handling           |
| `operations/dashboard/status/dds`            | DDS Status Reference        | State meanings and required responses                             |
| `operations/dashboard/status/duty-watch`     | Duty Watch Status Reference | Coverage state meanings and interventions                         |
| `operations/dashboard/status/building-state` | Building State Reference    | Open/locking/secured transitions                                  |
| `operations/dashboard/status/lockup-holder`  | Lockup Holder Reference     | Holder validation and transfer checks                             |

## Procedure Page Targets (Dashboard Tours)

| Source procedure             | Step ID           | Target slug                                 |
| ---------------------------- | ----------------- | ------------------------------------------- |
| `dashboard.admin.actions.v1` | `kiosk-checkin`   | `operations/day-duty/kiosk-check-in`        |
| `dashboard.admin.actions.v1` | `visitor-signin`  | `operations/day-duty/visitor-sign-in`       |
| `dashboard.admin.actions.v1` | `lockup-action`   | `operations/lockup/building-lockup-control` |
| `dashboard.admin.actions.v1` | `transfer-lockup` | `operations/lockup/transfer-lockup`         |

## Required Content Blocks Per Page

| Block                | Required            | Description                                   |
| -------------------- | ------------------- | --------------------------------------------- |
| Purpose              | Yes                 | One-sentence scope of the page                |
| Preconditions        | Yes                 | Role and state required before action         |
| Action Steps         | Yes                 | Ordered, auditable steps                      |
| Validation Checks    | Yes                 | Conditions that confirm success               |
| Failure / Escalation | Yes                 | What to do when expected state is not present |
| Related Pages        | Yes                 | Cross-links to sibling pages                  |
| Open Dashboard Link  | Yes (overview page) | Link to `http://sentinel.local/dashboard`     |

## Image Pack Specification

| Image ID                          | Suggested filename                    | Page usage                  |
| --------------------------------- | ------------------------------------- | --------------------------- |
| `dashboard-full-default`          | `dashboard-full-default.png`          | Overview hero image         |
| `dashboard-security-alerts-focus` | `dashboard-security-alerts-focus.png` | Security Alerts page        |
| `dashboard-quick-actions-focus`   | `dashboard-quick-actions-focus.png`   | Quick Actions page          |
| `dashboard-status-panel-focus`    | `dashboard-status-panel-focus.png`    | Status Panel page           |
| `dashboard-presence-grid-focus`   | `dashboard-presence-grid-focus.png`   | Presence Grid page          |
| `dashboard-state-alerts-active`   | `dashboard-state-alerts-active.png`   | Alert-state variant         |
| `dashboard-state-duty-watch-gap`  | `dashboard-state-duty-watch-gap.png`  | Duty Watch degraded variant |
| `dashboard-state-lockup-held`     | `dashboard-state-lockup-held.png`     | Lockup holder variant       |

## Image Generation Workflow (Playwright CLI)

| Step                     | Command / Action                                                  | Output                                                            |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Save authenticated state | `pnpm playwright-cli:auth`                                        | `.playwright-cli/auth.json`                                       |
| Capture dashboard set    | `pnpm playwright-cli:capture:dashboard`                           | PNG + YAML in `test-results/manual/playwright-cli/dashboard-wiki` |
| Curate wiki-ready assets | Copy selected PNG files to `screenshots/badges-ux/wiki-dashboard` | Publish-ready image pack                                          |

## Publishing Order

1. Create `operations/dashboard/overview` page and add appliance link.
2. Create section pages (`security-alerts`, `quick-actions`, `status-panel`, `presence-grid`).
3. Create status reference pages under `operations/dashboard/status/*`.
4. Verify each in-app tour step slug resolves to an existing page.
5. Upload image pack and insert images according to the mapping table.

## Validation Contract

| Check                              | Tool                    | Pass condition                      |
| ---------------------------------- | ----------------------- | ----------------------------------- |
| Route help slugs in index          | `pnpm check:help-slugs` | No missing route slugs              |
| Dashboard procedure slugs in index | `pnpm check:help-slugs` | No missing procedure slugs          |
| Slug format safety                 | `pnpm check:help-slugs` | Slugs match `^[a-z0-9][a-z0-9/-]*$` |

## Notes

- Keep page titles stable after publication to avoid operator confusion.
- Update image pack whenever Dashboard layout or action labels change.
- Treat Overview as the only mandatory page linked from the in-app route Help button.
