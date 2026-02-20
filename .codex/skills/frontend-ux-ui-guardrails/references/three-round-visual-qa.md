# Three-Round Visual QA (Mandatory)

Use this process for every edited or newly created frontend component/page.

## Hard Rules

- Use `playwright-cli` only for browser verification.
- Run exactly 3 rounds, in order.
- Capture artifacts every round (snapshot required, screenshot optional but recommended for significant UI changes).
- If any defect is found and fixed, restart from Round 1.
- Do not mark task complete without all 3 rounds passing.

## Canonical command flow

Adjust routes/actions to the feature under test.

```bash
# Round N
playwright-cli open http://localhost:3001/<route>
playwright-cli snapshot
# interact with changed/related UI
playwright-cli click <ref>
playwright-cli fill <ref> "..."
playwright-cli snapshot
playwright-cli screenshot --filename=<descriptive-name>.png
playwright-cli close
```

## Round 1: Targeted correctness

Goal: confirm the edited/new component/page is implemented correctly.

- Visit the exact route containing the changed UI.
- Exercise core states and primary actions.
- Verify layout, spacing, typography, status styles, and interactive controls.
- Record pass/fail and artifact references.

## Round 2: Adjacent/related regressions

Goal: ensure nearby UI on the same route (or tightly coupled flows) is not visually broken.

- Re-open same route.
- Interact with neighboring components and related states.
- Check modal stacking, table alignment, badges/chips, spacing rhythm, and control states.
- Record pass/fail and artifact references.

## Round 3: Cross-page/layout consistency

Goal: ensure global shell/pattern consistency remains intact.

- Visit at least one additional related route.
- Verify shared layout (navbar/shell), typography hierarchy, and reused components (cards, modals, tables).
- Confirm no style drift from design tokens and project conventions.
- Record pass/fail and artifact references.

## Evidence template

```md
### 3-Round Visual QA Evidence

- Round 1 (Targeted): route=<...>; actions=<...>; artifacts=<...>; result=PASS|FAIL
- Round 2 (Adjacent): route=<...>; actions=<...>; artifacts=<...>; result=PASS|FAIL
- Round 3 (Cross-page): route=<...>; actions=<...>; artifacts=<...>; result=PASS|FAIL
- Restart required: Yes|No
- Notes: <fixes applied if any>
```
