# Memory Refactor Summary

**Date**: 2026-01-20
**Status**: Phase 1 Complete - Files categorized and moved to refactor folder

---

## What Was Done

### ✅ Completed

1. **Created refactor directory structure**
   - `backend/` - Backend layer-specific rules
   - `general/` - Project-wide general rules
   - `procedural/` - Procedural/verbose guides

2. **Analyzed all memory files** (12 rules + 2 CLAUDE.md files)
   - Applied decision criteria (ALWAYS TRUE vs LAYER-SPECIFIC vs PROCEDURAL)
   - Created comprehensive categorization analysis

3. **Copied files to refactor folder** for review and organization
   - 3 backend-specific files
   - 5 general project-wide files
   - 7 procedural/verbose files

---

## File Locations After Refactor

### Backend-Specific (`backend/`)

**From**: `sentinel/.claude/rules/`

| File                      | Reason                                                     | Next Action                                           |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `10_testing-standards.md` | Only applies to backend tests (Vitest, Testcontainers)     | Move to `apps/backend/.claude/rules/testing.md`       |
| `20_database-patterns.md` | Only applies to backend database layer (Prisma, Kysely)    | Move to `apps/backend/.claude/rules/database.md`      |
| `30_auth-security.md`     | Only applies to backend auth layer (better-auth, API keys) | Move to `apps/backend/.claude/rules/auth-security.md` |

**Total**: 3 files

---

### General Project-Wide (`general/`)

**From**: `~/.claude/rules/` and `sentinel/.claude/rules/`

| File                       | Reason                                            | Next Action                                                   |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `git-workflow.md`          | Git Flow applies across entire project            | Review: Keep in project root or simplify?                     |
| `testing-strategy.md`      | Integration-first philosophy applies to all tests | Review: Keep in project root or extract to global principles? |
| `json-validation.md`       | Applies to backend + frontend (both parse JSON)   | Review: Extract pattern to global or keep project-specific?   |
| `90_monorepo-structure.md` | Monorepo conventions (pnpm workspaces, imports)   | **KEEP** in `sentinel/.claude/rules/` (simplified)            |
| `code-quality.md`          | Mixed: Some universal, some project-specific      | **SPLIT**: Universal → global, package manager → project      |

**Total**: 5 files

---

### Procedural/Verbose (`procedural/`)

**From**: `~/.claude/rules/`

| File                     | Reason                                               | Next Action                                                   |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------- |
| `releases.md`            | GitHub releases workflow (not universal)             | Convert to how-to guide or delete if not used                 |
| `markdown-delegation.md` | Assumes doc-orchestrator agent exists                | Convert to how-to or move to docs/                            |
| `project-setup.md`       | One-time setup checklist                             | Move to project README or docs/guides/                        |
| `git-operations.md`      | Git pre-operation checks (best practices, not rules) | Convert to how-to or delete if redundant with git-workflow.md |
| `modern-tools-usage.md`  | Verbose tool reference (fd, sg, jq)                  | Convert to reference doc or simplify dramatically             |
| `agents-skills.md`       | Agent/skill creation guide with tier metadata        | Move to docs/guides/ or .claude/agents/README.md              |
| `project-structure.md`   | Appears incomplete                                   | Review and complete or delete                                 |

**Total**: 7 files

---

## Next Steps (Recommended Phases)

### Phase 2: Extract Universal Principles (Global)

**Create**: `~/.claude/rules/core-principles.md`

Extract from `code-quality.md`:

- ✅ ALWAYS read files before editing
- ✅ NEVER use `any` type
- ✅ ALWAYS throw errors early
- ✅ Delegate complex tasks to subagents
- ✅ Use specialized tools (Read > cat, Grep > grep, Glob > find)

**Update**: `~/.claude/CLAUDE.md`

- ✅ Keep: Forbidden directories, Context7, platform notes
- ❌ Remove: Project-specific commands (pnpm test, etc.)

---

### Phase 3: Push Backend Rules to Layer

**Create**: `apps/backend/.claude/CLAUDE.md`

```markdown
# Backend Layer Rules

Domain-specific rules in `rules/` subdirectory:

- [testing.md](rules/testing.md) - Vitest, Testcontainers, Supertest
- [database.md](rules/database.md) - Prisma, Kysely, migrations
- [auth-security.md](rules/auth-security.md) - better-auth, API keys, OWASP

These rules ONLY apply to backend code.
```

**Create**: Backend rule files

- `apps/backend/.claude/rules/testing.md` (from `10_testing-standards.md`)
- `apps/backend/.claude/rules/database.md` (from `20_database-patterns.md`)
- `apps/backend/.claude/rules/auth-security.md` (from `30_auth-security.md`)

**Delete**: Original numbered files from `sentinel/.claude/rules/`

---

### Phase 4: Simplify Project Root

**Keep**: `sentinel/.claude/rules/90_monorepo-structure.md`

- Extract verbose examples
- Keep core import conventions, dependency management, build order

**Update**: `sentinel/CLAUDE.md`

- Remove detailed testing/database/auth sections
- Replace with: "See `apps/backend/.claude/CLAUDE.md` for backend rules"
- Keep: Architecture table, quick commands, specialized agents

---

### Phase 5: Handle Procedural Files

**Decision for each file**:

1. **Convert to docs/guides/**
   - `project-setup.md` → `docs/guides/howto/setup-development-environment.md`
   - `agents-skills.md` → `docs/guides/howto/create-agent-or-skill.md`
   - `markdown-delegation.md` → Delete (redundant with doc-orchestrator)

2. **Convert to reference**
   - `modern-tools-usage.md` → `docs/guides/reference/modern-cli-tools.md` (simplified)

3. **Merge into existing**
   - `git-operations.md` → Merge into `git-workflow.md` or delete
   - `releases.md` → Merge into git-workflow or delete if not used

4. **Delete**
   - `project-structure.md` (incomplete, redundant with monorepo-structure)

---

## Statistics

**Files Analyzed**: 12 rules + 2 CLAUDE.md = 14 files
**Files Categorized**:

- Backend-specific: 3 files (20%)
- General project: 5 files (33%)
- Procedural: 7 files (47%)

**Token Reduction Estimate**:

- Current: ~15,000 tokens loaded per session (all global + project rules)
- After refactor: ~3,000 tokens (only universal principles + project root)
- **Savings**: 80% reduction in unnecessary context

**Precision Improvement**:

- Backend tasks: Only load backend rules (targeted)
- Frontend tasks: Only load frontend rules (when created)
- General tasks: Only load universal principles

---

## Files in Refactor Folder

```
.claude/memory-refactor/
├── CATEGORIZATION-ANALYSIS.md     # Detailed analysis
├── REFACTOR-SUMMARY.md            # This file
├── backend/
│   ├── 10_testing-standards.md
│   ├── 20_database-patterns.md
│   └── 30_auth-security.md
├── general/
│   ├── code-quality.md
│   ├── git-workflow.md
│   ├── json-validation.md
│   ├── testing-strategy.md
│   └── 90_monorepo-structure.md
└── procedural/
    ├── agents-skills.md
    ├── git-operations.md
    ├── markdown-delegation.md
    ├── modern-tools-usage.md
    ├── project-setup.md
    ├── project-structure.md
    └── releases.md
```

**Total**: 15 files (12 rules + 2 analysis docs + 1 summary)

---

## Approval Needed

Before proceeding with Phase 2-5:

**Questions for user**:

1. Do you want to proceed with Phase 2 (extract universal principles to global)?
2. Do you want to proceed with Phase 3 (push backend rules to `apps/backend/.claude/`)?
3. How should we handle procedural files (convert to docs, delete, merge)?
4. Should we delete original files after moving, or keep as backup?

**Recommendation**:

- Start with Phase 2 + 3 (extract universal + push backend rules)
- Review procedural files manually (case-by-case decision)
- Delete originals only after confirming new structure works

---

## Success Criteria

**After refactor, Claude should**:

1. ✅ Only load universal principles for all projects (global)
2. ✅ Load backend rules ONLY when working in `apps/backend/`
3. ✅ Load project root rules for project-wide tasks (monorepo, git)
4. ✅ Never load procedural guides unless explicitly referenced

**Token budget per task**:

- Simple task: < 1,000 tokens (universal only)
- Backend task: < 3,000 tokens (universal + backend layer)
- Project-wide task: < 2,000 tokens (universal + project root)

**Current vs After**:

- Current: 15,000 tokens (everything loaded)
- After: 1,000-3,000 tokens (targeted loading)
- **Improvement**: 5-15x reduction

---

**Ready for review and next phase approval.**
