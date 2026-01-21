# Rules Authoring Standard (Canonical)

## Purpose

This document defines how all `CLAUDE.md` files must be written.
It is the single source of truth for rule authoring.

`CLAUDE.md` files are **constraints**, not explanations.

---

## Required Characteristics

All rules MUST:
- Be actionable and imperative
- Be unconditionally true for their directory scope
- Avoid rationale or background explanation
- Be concise and scannable

Move explanatory content to `/docs`.

---

## Required Template

Every `CLAUDE.md` MUST follow this structure:

```md
# CLAUDE Rules: <Area Name>

## Scope
Applies when editing files under: <path>

## Non-Negotiables (MUST / MUST NOT)
- MUST ...
- MUST NOT ...

## Defaults (SHOULD)
- SHOULD ...

## Workflow
- When X changes, do Y

## Output Contracts (only if required)
- Output MUST include ...
```

---

## Language Rules

- Use: MUST, MUST NOT, SHOULD, MAY
- Avoid: “try to”, “consider”, “generally”, “it is recommended”
- One rule per bullet

---

## Size & Scope Limits

- Target size: **200–600 tokens**
- If >600 tokens or >1 domain:
  - Split into deeper directories
- If not always true:
  - Move deeper or delete

---

## Review Checklist

For each rule file, verify:
- Single domain only
- Correct directory scope
- Imperative language
- No explanation or teaching
- No leakage into other domains

---

## Conflict Resolution

1. Deeper directory overrides higher
2. MUST overrides SHOULD
3. If unclear, ask before proceeding