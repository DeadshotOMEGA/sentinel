# Memory Refactor - Quick Start

**Status**: Phase 2 Complete ✅
**Date**: 2026-01-20

---

## What's in This Folder?

This folder contains the analysis and categorization of all Claude memory files (CLAUDE.md + rules) for the Sentinel project.

### Files

| File | Purpose |
|------|---------|
| `README.md` | This file (quick navigation) |
| `CATEGORIZATION-ANALYSIS.md` | Detailed analysis of each rule file |
| `REFACTOR-SUMMARY.md` | Summary of what was done + next steps |
| `ACTION-CHECKLIST.md` | Step-by-step execution guide |
| `PHASE-2-COMPLETE.md` | ✅ Phase 2 completion report |
| `backend/` | Backend layer-specific rules (3 files) |
| `general/` | Project-wide general rules (5 files) |
| `procedural/` | Procedural/verbose guides (7 files) |

**Total**: 15 files analyzed

---

## Quick Decision Summary

### ✅ KEEP GLOBAL (Universal for all projects)

**Extract to** `~/.claude/rules/core-principles.md`:
- File operations (read before edit)
- Code standards (no `any`, throw early)
- Tool usage (specialized tools first)
- JSON validation pattern

**Keep in** `~/.claude/CLAUDE.md`:
- Forbidden directories pattern
- Context7 MCP integration
- Platform notes (WSL2, python, line endings)

---

### ❌ MOVE TO PROJECT (Sentinel-specific)

**Backend Layer** (`apps/backend/.claude/rules/`):
- `testing.md` - Vitest, Testcontainers, Supertest
- `database.md` - Prisma, Kysely, migrations
- `auth-security.md` - better-auth, API keys, OWASP

**Project Root** (`sentinel/.claude/rules/`):
- `monorepo-structure.md` (simplified)
- `git-workflow.md` - Git Flow conventions

**Documentation** (`docs/guides/`):
- Setup guide (from project-setup.md)
- Agent/skill creation (from agents-skills.md)
- CLI tools reference (from modern-tools-usage.md)

**Delete** (redundant or not used):
- `markdown-delegation.md`
- `git-operations.md`
- `releases.md`
- `project-structure.md`

---

## Impact

### Before Refactor
- **Global rules**: 11 files (~8,000 tokens)
- **Project rules**: 4 files (~7,000 tokens)
- **Total context per task**: ~15,000 tokens
- **Problem**: Claude loads ALL rules even when irrelevant

### After Refactor
- **Global rules**: 1 file (~1,500 tokens)
- **Project root**: 2 files (~1,000 tokens)
- **Backend layer**: 3 files (~2,500 tokens)
- **Total context per backend task**: ~5,000 tokens
- **Improvement**: 66% reduction, targeted loading

---

## Next Steps

**Recommended order**:

1. **Phase 2**: Extract universal principles to global (15-30 min)
   - Create `~/.claude/rules/core-principles.md`
   - Update `~/.claude/CLAUDE.md`

2. **Phase 3**: Push backend rules to layer (10-15 min)
   - Create `apps/backend/.claude/CLAUDE.md`
   - Copy rules to `apps/backend/.claude/rules/`
   - Update project root CLAUDE.md

3. **Phase 4**: Simplify project root (20-30 min)
   - Simplify `monorepo-structure.md`
   - Move `git-workflow.md` to project

4. **Phase 5**: Handle procedural files (45-60 min)
   - Convert to docs/guides/ or delete

5. **Phase 6**: Cleanup (5-10 min)
   - Delete original files
   - Archive refactor folder

**Total time**: 1.5-2.5 hours

---

## Files to Review

### High Priority (Do First)

1. **Backend rules** (`backend/`)
   - These should move to `apps/backend/.claude/rules/` ASAP
   - High token cost, only relevant to backend work

2. **Core principles** (`general/code-quality.md`)
   - Extract universal rules to global
   - Reduces global context by ~60%

### Medium Priority

3. **Project-wide rules** (`general/`)
   - `git-workflow.md` - Keep in project root
   - `monorepo-structure.md` - Simplify
   - `testing-strategy.md` - Extract to global, delete specifics
   - `json-validation.md` - Extract to global

### Low Priority (Review Later)

4. **Procedural guides** (`procedural/`)
   - Case-by-case decision (convert, merge, or delete)
   - Can be done incrementally

---

## Quick Start Command

```bash
# See detailed action checklist
cat .claude/memory-refactor/ACTION-CHECKLIST.md

# See comprehensive analysis
cat .claude/memory-refactor/CATEGORIZATION-ANALYSIS.md

# See summary and next steps
cat .claude/memory-refactor/REFACTOR-SUMMARY.md
```

---

## Questions?

**See**:
- `CATEGORIZATION-ANALYSIS.md` - Why each file was categorized
- `REFACTOR-SUMMARY.md` - Statistics, next phases, approval needed
- `ACTION-CHECKLIST.md` - Step-by-step execution guide

**Ready to proceed with Phase 2-6 when approved.**
