---
type: plan
title: Wiki Page-By-Page Refresh
status: active
created: 2026-07-09
last_updated: 2026-07-09
lifecycle: active
reviewed: 2026-07-09
owner: Sentinel Operations
stakeholders:
  - Sentinel operators
  - Sentinel maintainers
related_code:
  - docs/wiki
  - scripts/wiki
  - scripts/playwright
related_plans: []
---

# Wiki Page-By-Page Refresh Implementation Plan

**Status:** Active

**Owner:** Sentinel Operations

**Timeline:** 2026-07-09 to completion

**Current Phase:** Complete; published and verified

---

## Executive Summary

Refresh the full repo-backed Sentinel Wiki page by page, add missing app help-linked pages, refresh or reuse screenshots, validate locally, and publish completed batches to Wiki.js.

**In one sentence:** Bring every Wiki source page, screenshot, and in-app Learn more target back into sync with current Sentinel UI and operations.

**Key changes:**

- Add a persistent page-by-page task list for all Wiki source pages.
- Create missing Wiki pages for app help slugs.
- Refresh screenshot capture, validation, and publish workflow tracking.

---

## Current State

**What exists now:**

- Wiki source pages live under `docs/wiki/`.
- Screenshot assets live under `docs/wiki/assets/wiki-dashboard/`.
- Publishing scripts live under `scripts/wiki/`.
- Playwright capture scripts live under `scripts/playwright/`.

**Baseline findings captured before implementation:**

- `pnpm check:help-slugs` failed because app help slugs were missing from the slug index.
- Several slug-index entries had no local source page.
- The image manifest contained todo rows for home, start-here, and DDS workflow captures.

---

## Goals

1. Every app `wikiSlug` resolves to a source page and slug-index entry.
2. Every `docs/wiki/**/*.md` page is reviewed and tracked.
3. UI-backed pages have current screenshots or documented screenshot reuse.
4. Batch publishers dry-run successfully before live publishing.
5. Published Wiki pages render text, images, navigation, and Learn more links correctly.

---

## Implementation Phases

### Phase 1: Inventory And Missing Pages

- [x] Create this active plan document.
- [x] Add source pages for missing app help slugs and slug-index-only pages.
- [x] Add missing help slugs to `docs/guides/reference/wiki-slug-index.json`.
- [x] Re-run `pnpm check:help-slugs` and record result.
- [x] Reconcile every source page row below.

### Phase 2: Screenshot Capture

- [x] Refresh Dashboard screenshots with `FRONTEND_URL=http://localhost:3001 pnpm playwright-cli:capture:dashboard`.
- [x] Refresh section screenshots with `FRONTEND_URL=http://localhost:3001 pnpm playwright-cli:capture:sections`.
- [x] Add or update capture coverage for home/start-here/DDS manifest todo rows.
- [x] Review generated images for sanitized data and correct UI state.
- [x] Update `docs/wiki/docs/image-capture-manifest.md` statuses and dates.

### Phase 3: Page Content Refresh

- [x] Refresh high-traffic home, start-here, Dashboard, and DDS workflow pages.
- [x] Refresh History, Members, Events, Schedules, Kiosk, Admin, and technical pages.
- [x] Text-only review labeling and automation pages.
- [x] Mark each page row complete only after text, links, images, and publish verification are complete.

### Phase 4: Validation And Publishing

- [x] `pnpm check:help-slugs` passes.
- [x] `pnpm wiki:check-terminology` passes.
- [x] `rg -n "TODO:|placehold.co" docs/wiki` returns no unresolved placeholders.
- [x] Dry-run `pnpm wiki:publish:dashboard:dry`.
- [x] Dry-run `pnpm wiki:publish:sections:dry`.
- [x] Dry-run `pnpm wiki:publish:home:dry`.
- [x] Dry-run `pnpm wiki:navigation:dry`.
- [x] Publish completed batches.
- [x] Verify published Wiki pages and images.

---

## Missing Help/Page Creation Checklist

- [x] `operations/dashboard/sidebar-recent-activity`
- [x] `operations/dashboard/dds-checklist`
- [x] `operations/dashboard/scanner-bar`
- [x] `operations/dashboard/next-tutorials`
- [x] `operations/dashboard/daily-start/dds-checklist`
- [x] `operations/dashboard/daily-start/dds-responsibility`
- [x] `operations/dashboard/daily-start/lockup-holder`
- [x] `operations/dashboard/daily-start/scanner-bar`
- [x] `operations/dashboard/daily-end/normal/person-card-review`
- [x] `operations/dashboard/daily-end/normal/manual-sign-out-choice`
- [x] `operations/dashboard/daily-end/normal/dds-checklist`
- [x] `operations/dashboard/daily-end/normal/execute-lockup`
- [x] `operations/dashboard/daily-end/dds-handoff/dds-status`
- [x] `operations/dashboard/daily-end/dds-handoff/evening-holder-present`
- [x] `operations/dashboard/daily-end/dds-handoff/transfer-lockup`
- [x] `operations/dashboard/daily-end/dds-handoff/confirm-holder`
- [x] `operations/dashboard/daily-end/dds-handoff/swk-transfer-reminder`
- [x] `operations/dashboard/daily-end/duty-watch/requirements`
- [x] `operations/dashboard/daily-end/duty-watch/person-card-review`
- [x] `operations/dashboard/daily-end/duty-watch/manual-sign-out-choice`
- [x] `operations/dashboard/daily-end/duty-watch/lockup-holder`
- [x] `operations/dashboard/daily-end/duty-watch/execute-lockup`
- [x] `operations/dashboard/daily-end/duty-watch/building-recheck`
- [x] `operations/dashboard/status/status-overview`
- [x] `operations/dashboard/presence/member-actions/open-member-actions`
- [x] `operations/dashboard/presence/member-actions/manual-checkout`
- [x] `operations/dashboard/presence/member-actions/temporary-role`
- [x] `operations/dashboard/presence/member-actions/tonight-override`
- [x] `operations/dashboard/presence/member-actions/transfer-lockup`
- [x] `operations/dashboard/presence/member-actions/recent-history`
- [x] `operations/dashboard/dds-transfer/current-dds`
- [x] `operations/dashboard/dds-transfer/open-transfer`
- [x] `operations/dashboard/dds-transfer/confirmation-panel`
- [x] `operations/dashboard/dds-transfer/pending-handover`
- [x] `operations/dashboard/dds-transfer/accept-responsibility`
- [x] `operations/dashboard/dds-transfer/confirm-new-dds`
- [x] `admin/badges/badge-lifecycle`
- [x] `operations/lockup/building-lockup-control`
- [x] `operations/lockup/transfer-lockup`
- [x] `technical/admin/control-center`
- [x] `technical/configuration/reference-data-settings`
- [x] `technical/database/read-only-explorer`
- [x] `technical/logs/live-operations-log-viewer`

---

## Page Review Matrix

| Done | Slug                                                                | Source page                                                                      | UI route     | Text updated | Image updated | Links checked | Published | Verified |
| ---- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------ | ------------ | ------------- | ------------- | --------- | -------- |
| [x]  | `admin/badges/badge-lifecycle`                                      | `docs/wiki/admin/badges/badge-lifecycle.md`                                      | `/admin`     | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `admin/members/bulk-actions`                                        | `docs/wiki/admin/members/bulk-actions.md`                                        | `/members`   | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `admin/members/create-civilian-staff`                               | `docs/wiki/admin/members/create-civilian-staff.md`                               | `/members`   | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `admin/members/create-member`                                       | `docs/wiki/admin/members/create-member.md`                                       | `/members`   | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `admin/members/edit-member`                                         | `docs/wiki/admin/members/edit-member.md`                                         | `/members`   | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `admin/members/filters-and-search`                                  | `docs/wiki/admin/members/filters-and-search.md`                                  | `/members`   | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `admin/members/import-csv`                                          | `docs/wiki/admin/members/import-csv.md`                                          | `/members`   | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `admin/members/member-records`                                      | `docs/wiki/admin/members/member-records.md`                                      | `/members`   | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `admin/members/qualifications-and-tags`                             | `docs/wiki/admin/members/qualifications-and-tags.md`                             | `/members`   | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `admin/members/sync-qualifications`                                 | `docs/wiki/admin/members/sync-qualifications.md`                                 | `/members`   | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `docs/home`                                                         | `docs/wiki/docs/home.md`                                                         | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `docs/image-capture-manifest`                                       | `docs/wiki/docs/image-capture-manifest.md`                                       | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `docs/kroki-test`                                                   | `docs/wiki/docs/kroki-test.md`                                                   | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `docs/start-here`                                                   | `docs/wiki/docs/start-here.md`                                                   | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `docs/wiki-page-review`                                             | `docs/wiki/docs/wiki-page-review.md`                                             | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `labeling-and-automation/README`                                    | `docs/wiki/labeling-and-automation/README.md`                                    | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `labeling-and-automation/automation-rules`                          | `docs/wiki/labeling-and-automation/automation-rules.md`                          | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `labeling-and-automation/changelog`                                 | `docs/wiki/labeling-and-automation/changelog.md`                                 | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `labeling-and-automation/label-meanings-and-examples`               | `docs/wiki/labeling-and-automation/label-meanings-and-examples.md`               | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `labeling-and-automation/label-taxonomy`                            | `docs/wiki/labeling-and-automation/label-taxonomy.md`                            | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `labeling-and-automation/pr-labeling-sop`                           | `docs/wiki/labeling-and-automation/pr-labeling-sop.md`                           | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `labeling-and-automation/project-field-mapping`                     | `docs/wiki/labeling-and-automation/project-field-mapping.md`                     | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `labeling-and-automation/release-labeling-sop`                      | `docs/wiki/labeling-and-automation/release-labeling-sop.md`                      | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `labeling-and-automation/triage-sop`                                | `docs/wiki/labeling-and-automation/triage-sop.md`                                | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/actions/action-block`                         | `docs/wiki/operations/dashboard/actions/action-block.md`                         | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/actions/manual-in-out`                        | `docs/wiki/operations/dashboard/actions/manual-in-out.md`                        | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/actions/open-or-lockup`                       | `docs/wiki/operations/dashboard/actions/open-or-lockup.md`                       | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/actions/transfer-dds`                         | `docs/wiki/operations/dashboard/actions/transfer-dds.md`                         | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/actions/transfer-lockup`                      | `docs/wiki/operations/dashboard/actions/transfer-lockup.md`                      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/alerts/missed-lockup-follow-up`               | `docs/wiki/operations/dashboard/alerts/missed-lockup-follow-up.md`               | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/building-recheck`                   | `docs/wiki/operations/dashboard/daily-end/building-recheck.md`                   | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/dds-handoff/confirm-holder`         | `docs/wiki/operations/dashboard/daily-end/dds-handoff/confirm-holder.md`         | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/dds-handoff/dds-status`             | `docs/wiki/operations/dashboard/daily-end/dds-handoff/dds-status.md`             | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/dds-handoff/evening-holder-present` | `docs/wiki/operations/dashboard/daily-end/dds-handoff/evening-holder-present.md` | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/dds-handoff/swk-transfer-reminder`  | `docs/wiki/operations/dashboard/daily-end/dds-handoff/swk-transfer-reminder.md`  | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/dds-handoff/transfer-lockup`        | `docs/wiki/operations/dashboard/daily-end/dds-handoff/transfer-lockup.md`        | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/duty-handoff`                       | `docs/wiki/operations/dashboard/daily-end/duty-handoff.md`                       | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/duty-watch/building-recheck`        | `docs/wiki/operations/dashboard/daily-end/duty-watch/building-recheck.md`        | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/duty-watch/execute-lockup`          | `docs/wiki/operations/dashboard/daily-end/duty-watch/execute-lockup.md`          | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/duty-watch/lockup-holder`           | `docs/wiki/operations/dashboard/daily-end/duty-watch/lockup-holder.md`           | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/duty-watch/manual-sign-out-choice`  | `docs/wiki/operations/dashboard/daily-end/duty-watch/manual-sign-out-choice.md`  | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/duty-watch/person-card-review`      | `docs/wiki/operations/dashboard/daily-end/duty-watch/person-card-review.md`      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/duty-watch/requirements`            | `docs/wiki/operations/dashboard/daily-end/duty-watch/requirements.md`            | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/escalation-notes`                   | `docs/wiki/operations/dashboard/daily-end/escalation-notes.md`                   | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/execute-lockup`                     | `docs/wiki/operations/dashboard/daily-end/execute-lockup.md`                     | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/lockup-holder`                      | `docs/wiki/operations/dashboard/daily-end/lockup-holder.md`                      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/normal/dds-checklist`               | `docs/wiki/operations/dashboard/daily-end/normal/dds-checklist.md`               | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/normal/execute-lockup`              | `docs/wiki/operations/dashboard/daily-end/normal/execute-lockup.md`              | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/normal/manual-sign-out-choice`      | `docs/wiki/operations/dashboard/daily-end/normal/manual-sign-out-choice.md`      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/normal/person-card-review`          | `docs/wiki/operations/dashboard/daily-end/normal/person-card-review.md`          | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/presence-review`                    | `docs/wiki/operations/dashboard/daily-end/presence-review.md`                    | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-end/security-alerts`                    | `docs/wiki/operations/dashboard/daily-end/security-alerts.md`                    | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/building-state`                   | `docs/wiki/operations/dashboard/daily-start/building-state.md`                   | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/dds-checklist`                    | `docs/wiki/operations/dashboard/daily-start/dds-checklist.md`                    | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/dds-responsibility`               | `docs/wiki/operations/dashboard/daily-start/dds-responsibility.md`               | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/dds`                              | `docs/wiki/operations/dashboard/daily-start/dds.md`                              | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/duty-watch`                       | `docs/wiki/operations/dashboard/daily-start/duty-watch.md`                       | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/escalation`                       | `docs/wiki/operations/dashboard/daily-start/escalation.md`                       | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/lockup-holder`                    | `docs/wiki/operations/dashboard/daily-start/lockup-holder.md`                    | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/presence-review`                  | `docs/wiki/operations/dashboard/daily-start/presence-review.md`                  | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/scanner-bar`                      | `docs/wiki/operations/dashboard/daily-start/scanner-bar.md`                      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/security-alerts`                  | `docs/wiki/operations/dashboard/daily-start/security-alerts.md`                  | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/daily-start/system-status`                    | `docs/wiki/operations/dashboard/daily-start/system-status.md`                    | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/dds-checklist`                                | `docs/wiki/operations/dashboard/dds-checklist.md`                                | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/dds-transfer/accept-responsibility`           | `docs/wiki/operations/dashboard/dds-transfer/accept-responsibility.md`           | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/dds-transfer/confirm-new-dds`                 | `docs/wiki/operations/dashboard/dds-transfer/confirm-new-dds.md`                 | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/dds-transfer/confirmation-panel`              | `docs/wiki/operations/dashboard/dds-transfer/confirmation-panel.md`              | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/dds-transfer/current-dds`                     | `docs/wiki/operations/dashboard/dds-transfer/current-dds.md`                     | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/dds-transfer/open-transfer`                   | `docs/wiki/operations/dashboard/dds-transfer/open-transfer.md`                   | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/dds-transfer/pending-handover`                | `docs/wiki/operations/dashboard/dds-transfer/pending-handover.md`                | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/help-button`                                  | `docs/wiki/operations/dashboard/help-button.md`                                  | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/navbar-brand`                                 | `docs/wiki/operations/dashboard/navbar-brand.md`                                 | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/navbar-navigation`                            | `docs/wiki/operations/dashboard/navbar-navigation.md`                            | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/next-tutorials`                               | `docs/wiki/operations/dashboard/next-tutorials.md`                               | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/overview`                                     | `docs/wiki/operations/dashboard/overview.md`                                     | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence-grid`                                | `docs/wiki/operations/dashboard/presence-grid.md`                                | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/empty-states`                        | `docs/wiki/operations/dashboard/presence/empty-states.md`                        | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/filters`                             | `docs/wiki/operations/dashboard/presence/filters.md`                             | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/manual-in-out`                       | `docs/wiki/operations/dashboard/presence/manual-in-out.md`                       | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/member-actions`                      | `docs/wiki/operations/dashboard/presence/member-actions.md`                      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/member-actions/manual-checkout`      | `docs/wiki/operations/dashboard/presence/member-actions/manual-checkout.md`      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/member-actions/open-member-actions`  | `docs/wiki/operations/dashboard/presence/member-actions/open-member-actions.md`  | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/member-actions/recent-history`       | `docs/wiki/operations/dashboard/presence/member-actions/recent-history.md`       | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/member-actions/temporary-role`       | `docs/wiki/operations/dashboard/presence/member-actions/temporary-role.md`       | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/member-actions/tonight-override`     | `docs/wiki/operations/dashboard/presence/member-actions/tonight-override.md`     | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/member-actions/transfer-lockup`      | `docs/wiki/operations/dashboard/presence/member-actions/transfer-lockup.md`      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/person-cards`                        | `docs/wiki/operations/dashboard/presence/person-cards.md`                        | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/search`                              | `docs/wiki/operations/dashboard/presence/search.md`                              | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/presence/visitor-checkout`                    | `docs/wiki/operations/dashboard/presence/visitor-checkout.md`                    | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/quick-actions`                                | `docs/wiki/operations/dashboard/quick-actions.md`                                | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/scanner-bar`                                  | `docs/wiki/operations/dashboard/scanner-bar.md`                                  | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/security-alerts`                              | `docs/wiki/operations/dashboard/security-alerts.md`                              | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/sidebar-recent-activity`                      | `docs/wiki/operations/dashboard/sidebar-recent-activity.md`                      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/status-panel`                                 | `docs/wiki/operations/dashboard/status-panel.md`                                 | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/status/building-state`                        | `docs/wiki/operations/dashboard/status/building-state.md`                        | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/status/dds`                                   | `docs/wiki/operations/dashboard/status/dds.md`                                   | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/status/duty-watch`                            | `docs/wiki/operations/dashboard/status/duty-watch.md`                            | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/status/lockup-holder`                         | `docs/wiki/operations/dashboard/status/lockup-holder.md`                         | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/status/quick-action-state`                    | `docs/wiki/operations/dashboard/status/quick-action-state.md`                    | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/status/status-overview`                       | `docs/wiki/operations/dashboard/status/status-overview.md`                       | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/system-status`                                | `docs/wiki/operations/dashboard/system-status.md`                                | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/dashboard/user-menu`                                    | `docs/wiki/operations/dashboard/user-menu.md`                                    | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/checkins-history-and-corrections`              | `docs/wiki/operations/day-duty/checkins-history-and-corrections.md`              | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/daily-start`                                   | `docs/wiki/operations/day-duty/daily-start.md`                                   | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/dashboard-status-for-dds`                      | `docs/wiki/operations/day-duty/dashboard-status-for-dds.md`                      | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/dds-daily-workflow`                            | `docs/wiki/operations/day-duty/dds-daily-workflow.md`                            | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/dds-start-here`                                | `docs/wiki/operations/day-duty/dds-start-here.md`                                | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/end-of-day-handoff`                            | `docs/wiki/operations/day-duty/end-of-day-handoff.md`                            | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/execute-lockup`                                | `docs/wiki/operations/day-duty/execute-lockup.md`                                | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/kiosk-check-in`                                | `docs/wiki/operations/day-duty/kiosk-check-in.md`                                | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/login-and-first-checks`                        | `docs/wiki/operations/day-duty/login-and-first-checks.md`                        | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/presence-visitors-and-corrections`             | `docs/wiki/operations/day-duty/presence-visitors-and-corrections.md`             | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/transfer-dds`                                  | `docs/wiki/operations/day-duty/transfer-dds.md`                                  | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/transfer-lockup`                               | `docs/wiki/operations/day-duty/transfer-lockup.md`                               | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/day-duty/visitor-sign-in`                               | `docs/wiki/operations/day-duty/visitor-sign-in.md`                               | `/dashboard` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/events/create-event`                                    | `docs/wiki/operations/events/create-event.md`                                    | `/events`    | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/events/duty-watch`                                      | `docs/wiki/operations/events/duty-watch.md`                                      | `/events`    | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/events/edit-cancel-delete`                              | `docs/wiki/operations/events/edit-cancel-delete.md`                              | `/events`    | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/events/event-detail`                                    | `docs/wiki/operations/events/event-detail.md`                                    | `/events`    | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/events/event-management`                                | `docs/wiki/operations/events/event-management.md`                                | `/events`    | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/events/list-and-filters`                                | `docs/wiki/operations/events/list-and-filters.md`                                | `/events`    | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/events/status-workflow`                                 | `docs/wiki/operations/events/status-workflow.md`                                 | `/events`    | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/history/edit-member-record`                             | `docs/wiki/operations/history/edit-member-record.md`                             | `/checkins`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/history/edit-visitor-record`                            | `docs/wiki/operations/history/edit-visitor-record.md`                            | `/checkins`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/history/filters`                                        | `docs/wiki/operations/history/filters.md`                                        | `/checkins`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/history/manual-corrections`                             | `docs/wiki/operations/history/manual-corrections.md`                             | `/checkins`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/history/overview`                                       | `docs/wiki/operations/history/overview.md`                                       | `/checkins`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/history/records-table`                                  | `docs/wiki/operations/history/records-table.md`                                  | `/checkins`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/kiosk/kiosk-operations`                                 | `docs/wiki/operations/kiosk/kiosk-operations.md`                                 | `/kiosk`     | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/lockup/building-lockup-control`                         | `docs/wiki/operations/lockup/building-lockup-control.md`                         | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/lockup/transfer-lockup`                                 | `docs/wiki/operations/lockup/transfer-lockup.md`                                 | `text-only`  | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/schedules/assign-dds`                                   | `docs/wiki/operations/schedules/assign-dds.md`                                   | `/schedules` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/schedules/assign-duty-watch`                            | `docs/wiki/operations/schedules/assign-duty-watch.md`                            | `/schedules` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/schedules/dds-duty-watch-scheduling`                    | `docs/wiki/operations/schedules/dds-duty-watch-scheduling.md`                    | `/schedules` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/schedules/member-picker`                                | `docs/wiki/operations/schedules/member-picker.md`                                | `/schedules` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/schedules/month-and-quarter-views`                      | `docs/wiki/operations/schedules/month-and-quarter-views.md`                      | `/schedules` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/schedules/night-overrides`                              | `docs/wiki/operations/schedules/night-overrides.md`                              | `/schedules` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/schedules/publish-and-edit`                             | `docs/wiki/operations/schedules/publish-and-edit.md`                             | `/schedules` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `operations/schedules/week-view`                                    | `docs/wiki/operations/schedules/week-view.md`                                    | `/schedules` | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `technical/admin/control-center`                                    | `docs/wiki/technical/admin/control-center.md`                                    | `/admin`     | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `technical/configuration/reference-data-settings`                   | `docs/wiki/technical/configuration/reference-data-settings.md`                   | `/admin`     | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `technical/database/read-only-explorer`                             | `docs/wiki/technical/database/read-only-explorer.md`                             | `/admin`     | [x]          | [x]           | [x]           | [x]       | [x]      |
| [x]  | `technical/logs/live-operations-log-viewer`                         | `docs/wiki/technical/logs/live-operations-log-viewer.md`                         | `/admin`     | [x]          | [x]           | [x]           | [x]       | [x]      |

---

## Success Metrics

- `pnpm check:help-slugs` passes with no missing slugs.
- Every row in the Page Review Matrix is checked.
- Every UI-backed page has a current or deliberately reused screenshot.
- Every published page loads at `http://docs.sentinel.local/` without broken images.

---

## Update Log

- 2026-07-09: Started active refresh plan, created missing help-linked pages, and updated slug index.

- 2026-07-09: `pnpm check:help-slugs`, `pnpm wiki:check-terminology`, and placeholder search passed after source-page and slug-index updates.

- 2026-07-09: Refreshed dashboard and section screenshots; sampled Dashboard and Members captures for visual sanity. Marked home/start-here/DDS manifest rows as reused because grouped publishers upload operations assets, not separate home/docs asset folders.

- 2026-07-09: Published 78 dashboard pages, 30 section pages, homepage/theme/navigation, and 34 remaining pages. Verified 143 live pages and 4 uploaded assets by HTTP status.
