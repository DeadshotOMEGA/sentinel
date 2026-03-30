# Kiosk UX/UI Five-Cycle Review

Date: March 26, 2026

## Sources Reviewed

- `apps/frontend-admin/src/components/dashboard/kiosk-checkin-screen.tsx`
- `apps/frontend-admin/src/components/kiosk/kiosk-shell.tsx`
- `apps/frontend-admin/src/components/kiosk/kiosk-responsibility-prompt.tsx`
- `apps/frontend-admin/src/components/kiosk/visitor-self-signin-modal.tsx`
- `docs/wiki/operations/kiosk/kiosk-operations.md`
- `docs/wiki/operations/day-duty/kiosk-check-in.md`
- `docs/mermaid/scan-system/main-scan-flow.mmd`
- `docs/mermaid/scan-system/dds-acceptance-flow.mmd`
- `tests/e2e/frontend/kiosk-first-entry-dds.spec.ts`
- Playwright CLI capture artifacts under `test-results/kiosk-ux-review/`

## Kiosk Intent

The kiosk exists to do four jobs with almost no ambiguity:

1. Let members scan a badge and get an immediate, legible check-in or check-out result.
2. Offer a visitor self-sign-in path without competing with the member badge workflow.
3. Interrupt the flow with unmistakable responsibility prompts when the building is secured or DDS is unresolved.
4. Give just enough supporting context to resolve exceptions without burying the primary task.

## What Should Be Most Prominent

- The badge scan entry and scan button.
- The current live result state after a scan.
- Responsibility-required overlays when present.

## What Should Stay Secondary

- Visitor self-sign-in.
- Supporting operational cards.
- Clock, kiosk ID, and maintenance affordances.

## Grading Rubric

| Category                                            | Weight |
| --------------------------------------------------- | -----: |
| Task clarity and primary-action prominence          |     25 |
| Scan feedback readability and state communication   |     20 |
| Touch usability and target sizing                   |     15 |
| Information hierarchy and density control           |     15 |
| Operational support content relevance               |     10 |
| Visual consistency with Sentinel design system      |     10 |
| Responsive robustness at narrower kiosk stress size |      5 |

## Cycle Summary

| Cycle | Pre | Post | Delta |
| ----- | --: | ---: | ----: |
| 1     |  61 |   73 |   +12 |
| 2     |  73 |   81 |    +8 |
| 3     |  81 |   86 |    +5 |
| 4     |  86 |   89 |    +3 |
| 5     |  89 |   92 |    +3 |

## Cycle 1

### Pre-Fix Grade: 61/100

| Category                                          | Score |
| ------------------------------------------------- | ----: |
| Task clarity and primary-action prominence        | 14/25 |
| Scan feedback readability and state communication | 13/20 |
| Touch usability and target sizing                 | 10/15 |
| Information hierarchy and density control         |  8/15 |
| Operational support content relevance             |  7/10 |
| Visual consistency with Sentinel design system    |  7/10 |
| Responsive robustness                             |   2/5 |

Strengths:

- The kiosk already supported ready, success, warning, error, visitor, and responsibility states.
- The visitor path was present and clearly labeled.
- The response panel used semantic state badges correctly.

Top defects:

- The scan entry, visitor CTA, and result panel fought for equal attention.
- The header consumed too much prominence relative to the task.
- The support rail read like a second primary surface.

Evidence:

- Pre artifacts: `test-results/kiosk-ux-review/cycle-01/pre/`

Issues opened or updated:

- `KIOSK-UX-001`
- `KIOSK-UX-002`
- `KIOSK-UX-003`

### Post-Fix Grade: 73/100

| Category                                          | Score |
| ------------------------------------------------- | ----: |
| Task clarity and primary-action prominence        | 18/25 |
| Scan feedback readability and state communication | 15/20 |
| Touch usability and target sizing                 | 12/15 |
| Information hierarchy and density control         | 10/15 |
| Operational support content relevance             |  8/10 |
| Visual consistency with Sentinel design system    |  8/10 |
| Responsive robustness                             |   2/5 |

What improved:

- The kiosk gained a dominant member-flow surface with large scan controls.
- The result state became part of the primary deck instead of an afterthought below it.
- The visitor path became explicitly secondary.

What still needed work:

- The responsibility overlay still felt too form-like.
- The visitor flow still hid the touch keyboard too long.
- On narrow view, ordering still favored visitor content over the live result.

Evidence:

- Post artifacts: `test-results/kiosk-ux-review/cycle-01/post/`

## Cycle 2

### Pre-Fix Grade: 73/100

Baseline reused from cycle 1 post.

### Post-Fix Grade: 81/100

| Category                                          | Score |
| ------------------------------------------------- | ----: |
| Task clarity and primary-action prominence        | 20/25 |
| Scan feedback readability and state communication | 17/20 |
| Touch usability and target sizing                 | 13/15 |
| Information hierarchy and density control         | 11/15 |
| Operational support content relevance             |  8/10 |
| Visual consistency with Sentinel design system    |  9/10 |
| Responsive robustness                             |   3/5 |

What improved:

- The responsibility overlay gained a stronger full-screen interruption feel.
- Decision language became more direct and operational.
- The overlay actions read more like kiosk decisions and less like an admin form.

What still needed work:

- Visitor touch entry still required too much manual discovery.
- Dev-only chrome was still leaking into the kiosk route during local review.

Evidence:

- Pre artifacts: `test-results/kiosk-ux-review/cycle-02/pre/`
- Post artifacts: `test-results/kiosk-ux-review/cycle-02/post/`

Issues opened or updated:

- `KIOSK-UX-003`
- `KIOSK-UX-004`
- `KIOSK-UX-006`

## Cycle 3

### Pre-Fix Grade: 81/100

Baseline reused from cycle 2 post.

### Post-Fix Grade: 86/100

| Category                                          | Score |
| ------------------------------------------------- | ----: |
| Task clarity and primary-action prominence        | 21/25 |
| Scan feedback readability and state communication | 17/20 |
| Touch usability and target sizing                 | 14/15 |
| Information hierarchy and density control         | 12/15 |
| Operational support content relevance             |  9/10 |
| Visual consistency with Sentinel design system    |  9/10 |
| Responsive robustness                             |   4/5 |

What improved:

- The visitor flow now auto-surfaces the first text field and touch keyboard on the details step.
- The modal reads more like a touch kiosk workflow and less like a generic desktop dialog.
- Narrow-view visitor capture now shows the intended keyboard-first interaction.

What still needed work:

- The local dev-only Next.js button still appeared in captures.
- The idle state copy was clearer, but narrow ordering still needed polishing.

Evidence:

- Pre artifacts: `test-results/kiosk-ux-review/cycle-03/pre/`
- Post artifacts: `test-results/kiosk-ux-review/cycle-03/post/`

Issues opened or updated:

- `KIOSK-UX-004`
- `KIOSK-UX-006`
- `KIOSK-UX-007`

## Cycle 4

### Pre-Fix Grade: 86/100

Baseline reused from cycle 3 post.

### Post-Fix Grade: 89/100

| Category                                          | Score |
| ------------------------------------------------- | ----: |
| Task clarity and primary-action prominence        | 22/25 |
| Scan feedback readability and state communication | 18/20 |
| Touch usability and target sizing                 | 14/15 |
| Information hierarchy and density control         | 12/15 |
| Operational support content relevance             |  9/10 |
| Visual consistency with Sentinel design system    | 10/10 |
| Responsive robustness                             |   4/5 |

What improved:

- Idle copy became operational and action-led.
- The kiosk shell felt more appliance-like and less like a standard app page.
- The fullscreen prompt became cleaner and less visually noisy.

What still needed work:

- The local dev-only Next.js button remained visible in Playwright captures.
- On narrow view, the visitor card still sat ahead of the result panel.

Evidence:

- Pre artifacts: `test-results/kiosk-ux-review/cycle-04/pre/`
- Post artifacts: `test-results/kiosk-ux-review/cycle-04/post/`

Issues opened or updated:

- `KIOSK-UX-002`
- `KIOSK-UX-006`
- `KIOSK-UX-007`

## Cycle 5

### Pre-Fix Grade: 89/100

Baseline reused from cycle 4 post.

### Post-Fix Grade: 92/100

| Category                                          | Score |
| ------------------------------------------------- | ----: |
| Task clarity and primary-action prominence        | 23/25 |
| Scan feedback readability and state communication | 18/20 |
| Touch usability and target sizing                 | 14/15 |
| Information hierarchy and density control         | 13/15 |
| Operational support content relevance             |  9/10 |
| Visual consistency with Sentinel design system    | 10/10 |
| Responsive robustness                             |   5/5 |

What improved:

- Narrow layout now preserves `scan -> result -> visitor` order.
- Idle, invalid, success, responsibility, and visitor states all keep the primary flow readable.
- The kiosk now consistently presents the live result before secondary content.

Remaining concerns:

- A dev-only Next.js button still appears in local dev captures even after route-level concealment work.
- This does not affect production kiosk output, but it remains a local-review artifact.

Evidence:

- Pre artifacts: `test-results/kiosk-ux-review/cycle-05/pre/`
- Post artifacts: `test-results/kiosk-ux-review/cycle-05/post/`

Issues opened or updated:

- `KIOSK-UX-002`
- `KIOSK-UX-006`

## Final Assessment

Final grade: 92/100

The kiosk now reads as a purpose-built operational station:

- member scanning is the unquestioned primary action,
- the live result is immediate and prominent,
- visitor sign-in is clearly available without competing,
- responsibility prompts are more decisive and kiosk-appropriate,
- the narrow layout preserves the intended task order.

The main remaining defect is local-dev chrome bleeding into Playwright evidence. That is documented as deferred because it is development-only and does not reflect the intended production kiosk surface.
