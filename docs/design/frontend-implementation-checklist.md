---
type: reference
title: Frontend Implementation Checklist
status: active
created: 2026-02-19
last_updated: 2026-02-19
---

# Frontend Implementation Checklist

Checklist for implementing or reviewing frontend work in `apps/frontend-admin/`.

## 1. Pre-Implementation Reading

- [ ] Read `docs/design/design-principles.md`
- [ ] Read `docs/design/style-guide.md`
- [ ] Read `apps/frontend-admin/src/styles/tokens.css`
- [ ] Read `apps/frontend-admin/src/app/globals.css`
- [ ] Read nearest `AGENTS.md` and `CLAUDE.md`

## 2. DaisyUI-First and Component Selection

- [ ] Checked `mcp__daisyui-blueprint__daisyUI-Snippets` for relevant UI patterns
- [ ] Used DaisyUI components/classes when equivalent exists
- [ ] Used `AppCard` for container semantics where applicable
- [ ] Used `AppBadge` for status indicators only
- [ ] Used `Chip` for decorative tags/categories
- [ ] Documented fallback reason if custom UI was required

## 3. Tokens, Color, and Motion

- [ ] Spacing uses `--space-*` tokens (no new magic spacing values)
- [ ] Elevation and z-index follow token scale
- [ ] Semantic colors are used only for semantic meaning
- [ ] Motion is functional, subtle, and respects `prefers-reduced-motion`
- [ ] Interaction timing uses project duration tokens

## 4. Required Delivery Evidence

- [ ] Included `DaisyUI Fit Check`
- [ ] Included `Research Notes`
- [ ] Included `Design Compliance Checklist`

## 5. 3-Round Visual QA (Final Gate)

Use `playwright-cli` for all edited or newly created components/pages.

- [ ] Round 1 complete: targeted component/page correctness verified
- [ ] Round 2 complete: adjacent/related same-route regressions verified
- [ ] Round 3 complete: cross-page/layout consistency verified
- [ ] Round evidence includes route, interactions, artifact references, and pass/fail notes
- [ ] If any round failed, fixes were applied and QA restarted from Round 1
- [ ] Task not marked complete until all 3 rounds passed
