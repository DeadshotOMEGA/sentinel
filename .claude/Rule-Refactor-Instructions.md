# Claude Code Rule Refactoring Instructions

## Purpose

This document defines how to **analyze, split, and relocate existing CLAUDE.md and rule files** to reduce global token load and improve relevance.

The goal is to replace a centralized, global rule system with **scoped, directory-specific instruction files** that are injected only when relevant.

Claude Code should treat this document as **procedural instructions**, not general guidance.

---

## Core Principles

1. **Rules are commands, not documentation**
   - Rules must tell Claude Code *what to do*
   - Explanations, rationale, or teaching belong in `/docs`, not `.claude`

2. **Rules should be pulled by relevance, not pushed globally**
   - A rule should only apply when it is *always true* for the files being edited

3. **The deepest valid directory wins**
   - Rules belong in the *deepest directory where they are unconditionally correct*

4. **Smaller, scoped rules are preferred**
   - Many small, relevant CLAUDE.md files are better than few large global ones

---

## Definitions

### “Push it down”
Move a rule from a higher-level (global or project) location into a **lower-level directory** where the rule is always applicable.

Example:
- Global testing rules → `/backend/.claude/CLAUDE.md`
- Auth-specific rules → `/backend/auth/.claude/CLAUDE.md`

---

### “Split it”
Break a large rule file into **multiple single-responsibility rule files**, each covering only one concern.

A rule file should ideally:
- Cover one domain (testing, auth, DB, frontend UI, etc.)
- Be relevant to one directory subtree
- Stay as small as reasonably possible

---

## Rule Evaluation Checklist

For **each rule or paragraph**, answer:

> “If Claude Code edits a random file in this directory, must this rule always apply?”

| Answer | Required Action |
|------|-----------------|
| Yes, for entire repo | Keep in root CLAUDE.md |
| Yes, for a specific layer | Push to that layer’s directory |
| Yes, for a feature/domain | Push to that feature folder |
| Only sometimes | Remove from rules |
| Explains *why*, not *what* | Move to `/docs` |

---

## Target Structure

### Root `CLAUDE.md` (keep minimal)

Allowed content:
- Global philosophy and tone
- Conflict resolution (“closest CLAUDE.md wins”)
- Clarification behavior
- Safety constraints (no invented APIs, no silent assumptions)

Target size:
- **300–600 tokens**

---

### Layer-Level CLAUDE.md Files

Examples:
```
/backend/.claude/CLAUDE.md
/frontend/.claude/CLAUDE.md
/packages/db/.claude/CLAUDE.md
```

Contain:
- Architectural constraints
- Layer-specific conventions
- Tooling expectations relevant to that layer

---

### Domain / Feature-Level CLAUDE.md Files

Examples:
```
/backend/auth/.claude/CLAUDE.md
/backend/tests/.claude/CLAUDE.md
/frontend/components/.claude/CLAUDE.md
```

Contain:
- Highly specific rules
- Domain invariants
- Exact formats, schemas, or constraints

---

## Refactoring Procedure (Step-by-Step)

1. Identify an existing rule file
2. Break it into logical sections
3. For each section:
   - Determine the deepest directory where it is always true
   - Move or rewrite it into that directory’s CLAUDE.md
4. Remove duplicated or implied rules
5. Rewrite remaining rules as **direct instructions**
6. Delete or heavily shrink the original global rule file

Repeat until:
- Global rules are minimal
- Most complexity lives close to the code it governs

---

## Heuristics (Important)

- If a rule file exceeds ~1,000 tokens, it likely needs splitting
- If a rule teaches or explains, it probably belongs in `/docs`
- If a rule references multiple unrelated domains, it must be split
- Prefer explicit directory scope over conditional language

---

## Success Criteria

This refactor is complete when:
- Editing unrelated files does **not** load irrelevant rules
- Claude Code responses feel lighter and more focused
- Token usage is significantly reduced
- Rules are easy to locate and reason about

---

## Final Instruction to Claude Code

When assisting with this refactor:
- Ask clarifying questions if directory intent is unclear
- Do not invent directory structure without confirmation
- Prefer moving rules downward over keeping them global
- Preserve intent while reducing scope and verbosity
