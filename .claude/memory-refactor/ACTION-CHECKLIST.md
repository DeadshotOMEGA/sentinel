# Memory Refactor Action Checklist

Quick reference for executing the refactor phases.

---

## Phase 1: ✅ COMPLETE

- [x] Create refactor directory structure
- [x] Analyze all rules with decision criteria
- [x] Copy files to categorized folders
- [x] Create analysis and summary documents

---

## Phase 2: Extract Universal Principles (Global)

### 2.1 Create Core Principles File

**File**: `~/.claude/rules/core-principles.md`

```bash
# Create new file
touch ~/.claude/rules/core-principles.md
```

**Content to extract from `code-quality.md`**:

- File operations (read before edit, batch edits)
- Code standards (no `any`, throw early, delegate)
- Tool usage (specialized tools first)

### 2.2 Update Global CLAUDE.md

**File**: `~/.claude/CLAUDE.md`

**Remove**:

- Project-specific commands table (pnpm test, bun install, etc.)
- Package manager preference (bun vs pnpm)

**Keep**:

- Forbidden directories pattern
- Context7 MCP integration
- Platform notes (WSL2, python command, line endings)
- Quick setup checklist

### 2.3 Delete Redundant Global Rules

**After extracting to `core-principles.md`**:

```bash
rm ~/.claude/rules/code-quality.md  # Content moved to core-principles
```

**Result**: Global context reduced by ~60%

---

## Phase 3: Push Backend Rules to Layer

### 3.1 Create Backend CLAUDE.md

**File**: `apps/backend/.claude/CLAUDE.md`

```bash
mkdir -p apps/backend/.claude/rules
touch apps/backend/.claude/CLAUDE.md
```

**Content**:

```markdown
# Backend Layer Rules

Domain-specific rules in `rules/` subdirectory:

- [testing.md](rules/testing.md) - Vitest, Testcontainers, Supertest
- [database.md](rules/database.md) - Prisma, Kysely, migrations
- [auth-security.md](rules/auth-security.md) - better-auth, API keys, OWASP

These rules ONLY apply to backend code.
```

### 3.2 Create Backend Rule Files

**Copy from refactor folder**:

```bash
# Testing
cp .claude/memory-refactor/backend/10_testing-standards.md \
   apps/backend/.claude/rules/testing.md

# Database
cp .claude/memory-refactor/backend/20_database-patterns.md \
   apps/backend/.claude/rules/database.md

# Auth/Security
cp .claude/memory-refactor/backend/30_auth-security.md \
   apps/backend/.claude/rules/auth-security.md
```

### 3.3 Update Project Root CLAUDE.md

**File**: `sentinel/CLAUDE.md`

**Replace detailed sections**:

```markdown
## Domain Rules

Detailed patterns in `.claude/rules/`:

- Testing: @.claude/rules/10_testing-standards.md
- Database: @.claude/rules/20_database-patterns.md
- Auth/Security: @.claude/rules/30_auth-security.md
- Monorepo: @.claude/rules/90_monorepo-structure.md
```

**With**:

```markdown
## Layer-Specific Rules

**Backend**: See @apps/backend/.claude/CLAUDE.md for testing, database, and auth rules.

**Project-wide**: See `.claude/rules/` for monorepo structure.
```

### 3.4 Delete Original Numbered Files

**After confirming new structure works**:

```bash
rm .claude/rules/10_testing-standards.md
rm .claude/rules/20_database-patterns.md
rm .claude/rules/30_auth-security.md
```

**Result**: Backend rules only load when working in backend layer

---

## Phase 4: Simplify Project Root

### 4.1 Simplify Monorepo Structure Rule

**File**: `.claude/rules/90_monorepo-structure.md`

**Current**: 250 lines (verbose examples)
**Target**: 100 lines (core rules only)

**Keep**:

- Package naming convention
- Import conventions (workspace packages vs internal)
- Dependency management commands
- Build order

**Remove**:

- Verbose examples
- Common mistakes section (move to docs if needed)
- Environment variables setup (covered in project setup)

### 4.2 Move General Rules

**Decision for each file in `general/`**:

| File                       | Action                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `git-workflow.md`          | Keep in `sentinel/.claude/rules/` (project-wide)                                             |
| `testing-strategy.md`      | Extract philosophy to global `core-principles.md`, delete specific patterns (now in backend) |
| `json-validation.md`       | Extract pattern to global `core-principles.md`                                               |
| `code-quality.md`          | Already handled in Phase 2                                                                   |
| `90_monorepo-structure.md` | Simplify (see 4.1)                                                                           |

**Commands**:

```bash
# Move git-workflow to project
cp .claude/memory-refactor/general/git-workflow.md \
   .claude/rules/git-workflow.md

# Simplify monorepo (manual editing required)
# Keep original for now, update in place
```

**Result**: Only essential project-wide rules remain

---

## Phase 5: Handle Procedural Files

### 5.1 Convert to Docs

**Create how-to guides**:

```bash
# Setup guide
cat .claude/memory-refactor/procedural/project-setup.md \
  > docs/guides/howto/setup-development-environment.md

# Agent/skill creation
cat .claude/memory-refactor/procedural/agents-skills.md \
  > docs/guides/howto/create-agent-or-skill.md
```

### 5.2 Convert to Reference

**Modern tools reference**:

```bash
# Simplify and move to docs
# (Manual editing required - extract tool table only)
touch docs/guides/reference/modern-cli-tools.md
```

### 5.3 Merge or Delete

**Candidates for deletion**:

- `markdown-delegation.md` - Redundant (doc-orchestrator handles this)
- `git-operations.md` - Redundant with `git-workflow.md`
- `releases.md` - Not currently used (GitHub releases not set up)
- `project-structure.md` - Incomplete, redundant with monorepo-structure

**Command** (after manual review):

```bash
# Delete if confirmed redundant
rm .claude/memory-refactor/procedural/markdown-delegation.md
rm .claude/memory-refactor/procedural/git-operations.md
rm .claude/memory-refactor/procedural/releases.md
rm .claude/memory-refactor/procedural/project-structure.md
```

**Result**: No procedural guides in .claude/rules/

---

## Phase 6: Cleanup

### 6.1 Remove Global Rules (After Extraction)

**Files to delete from `~/.claude/rules/`**:

```bash
rm ~/.claude/rules/releases.md
rm ~/.claude/rules/markdown-delegation.md
rm ~/.claude/rules/project-setup.md
rm ~/.claude/rules/git-operations.md
rm ~/.claude/rules/modern-tools-usage.md
rm ~/.claude/rules/agents-skills.md
rm ~/.claude/rules/project-structure.md
rm ~/.claude/rules/code-quality.md  # Extracted to core-principles
rm ~/.claude/rules/git-workflow.md  # Moved to project
rm ~/.claude/rules/testing-strategy.md  # Extracted to core-principles
rm ~/.claude/rules/json-validation.md  # Extracted to core-principles
```

### 6.2 Archive Refactor Folder

**After confirming everything works**:

```bash
mv .claude/memory-refactor .claude/memory-refactor-2026-01-20-complete
```

Or delete entirely:

```bash
rm -rf .claude/memory-refactor
```

---

## Verification Checklist

After completing all phases:

### Global Rules

- [ ] Only 1-2 files in `~/.claude/rules/` (core-principles.md)
- [ ] Global CLAUDE.md has no project-specific commands
- [ ] Token count for global context < 2,000 tokens

### Project Rules

- [ ] `apps/backend/.claude/` exists with CLAUDE.md + rules/
- [ ] Backend rules (testing, database, auth) only in backend layer
- [ ] Project root `.claude/rules/` only has monorepo-structure + git-workflow
- [ ] Project CLAUDE.md references backend layer (not duplicating rules)

### Documentation

- [ ] Procedural guides moved to `docs/guides/howto/`
- [ ] No procedural content in `.claude/rules/`
- [ ] How-to guides follow Diátaxis framework

### Token Budget

- [ ] Global context: < 2,000 tokens
- [ ] Project context: < 1,500 tokens
- [ ] Backend context: < 2,500 tokens
- [ ] Total for backend task: < 6,000 tokens (vs 15,000 before)

---

## Quick Commands

```bash
# Phase 2: Extract universal principles
touch ~/.claude/rules/core-principles.md
# (Edit manually to extract from code-quality.md)

# Phase 3: Push backend rules to layer
mkdir -p apps/backend/.claude/rules
touch apps/backend/.claude/CLAUDE.md
cp .claude/memory-refactor/backend/*.md apps/backend/.claude/rules/
# (Rename files: remove numbers, use descriptive names)

# Phase 4: Simplify project root
cp .claude/memory-refactor/general/git-workflow.md .claude/rules/
# (Edit 90_monorepo-structure.md to simplify)

# Phase 5: Handle procedural
# (Manual review and convert case-by-case)

# Phase 6: Cleanup
# (Delete original files after confirming new structure works)
```

---

## Timeline Estimate

| Phase   | Complexity | Time Estimate                           |
| ------- | ---------- | --------------------------------------- |
| Phase 2 | Low        | 15-30 min (manual extraction)           |
| Phase 3 | Low        | 10-15 min (copy + rename files)         |
| Phase 4 | Medium     | 20-30 min (simplify monorepo rule)      |
| Phase 5 | High       | 45-60 min (review each procedural file) |
| Phase 6 | Low        | 5-10 min (delete + archive)             |

**Total**: 1.5-2.5 hours

**Recommendation**: Do Phase 2-3 first (high impact, low effort), then Phase 4-5-6 later.

---

**Current Status**: Phase 1 complete, ready for Phase 2.
