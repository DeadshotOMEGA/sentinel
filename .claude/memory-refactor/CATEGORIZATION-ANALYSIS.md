# Memory Refactor Categorization Analysis

## Decision Criteria

1. **ALWAYS TRUE (Keep Global)** - Rules that apply to every file in every project
2. **LAYER-SPECIFIC** - Rules only for Backend, Frontend, or Infrastructure layers
3. **DOMAIN-SPECIFIC** - Rules only for tests, auth, DB, etc.
4. **PROCEDURAL/VERBOSE** - Step-by-step guides that should be broken down

---

## Global Rules Analysis (`~/.claude/rules/`)

### ✅ KEEP GLOBAL (Universal Rules)

**code-quality.md** (Partially)

- ✅ Keep: "ALWAYS read files before editing", "Never use `any` type", "Delegate complex tasks"
- ❌ Move: Package manager preference (project-specific: "use bun")
- **Action**: Extract universal rules, move package manager choice to project

**Forbidden Directories** (from global CLAUDE.md)

- ✅ Keep: Pattern of ignoring build artifacts, lock files, git, statusline
- **Action**: Keep as-is in global CLAUDE.md

---

### ❌ MOVE TO PROJECT (Layer/Domain-Specific)

**releases.md**

- **Scope**: GitHub releases, filename conventions
- **Decision**: Project-specific (not all projects use GitHub releases)
- **Action**: Move to `procedural/`

**markdown-delegation.md**

- **Scope**: Delegating to doc-orchestrator agent
- **Decision**: Procedural, project-specific (assumes doc-orchestrator exists)
- **Action**: Move to `procedural/`

**project-setup.md**

- **Scope**: Checklist for cloning/setup
- **Decision**: Procedural, one-time setup
- **Action**: Move to `procedural/`

**git-operations.md**

- **Scope**: Pre-operation validation checks
- **Decision**: Procedural best practices (not enforced rules)
- **Action**: Move to `procedural/`

**json-validation.md**

- **Scope**: JSON parsing error handling
- **Decision**: Domain-specific (only for code that parses JSON)
- **Action**: Move to `general/` (applies to both backend/frontend)

**modern-tools-usage.md**

- **Scope**: fd, sg, jq, xq tool usage
- **Decision**: Procedural, verbose reference guide
- **Action**: Move to `procedural/`

**git-workflow.md**

- **Scope**: Git Flow conventions, branch naming
- **Decision**: Project-specific workflow
- **Action**: Move to `general/` (applies across project)

**testing-strategy.md**

- **Scope**: Integration-first philosophy, test distribution
- **Decision**: Project-specific testing approach
- **Action**: Move to `general/` (applies to all project tests)

**agents-skills.md**

- **Scope**: Creating agents with tier metadata
- **Decision**: Procedural, specific to agent authoring
- **Action**: Move to `procedural/`

**project-structure.md**

- **Scope**: Directory layout (appears incomplete in context)
- **Decision**: Project-specific
- **Action**: Move to `general/`

---

## Project Rules Analysis (`sentinel/.claude/rules/`)

### ❌ MOVE CLOSER TO CODE (Backend-Specific)

**10_testing-standards.md**

- **Scope**: Vitest, Testcontainers, Supertest patterns
- **Decision**: Backend testing layer only
- **Action**: Move to `backend/testing/`
- **Recommendation**: Create `apps/backend/.claude/rules/testing.md`

**20_database-patterns.md**

- **Scope**: Prisma, Kysely, migration workflows
- **Decision**: Backend database layer only
- **Action**: Move to `backend/database/`
- **Recommendation**: Create `apps/backend/.claude/rules/database.md`

**30_auth-security.md**

- **Scope**: better-auth, API keys, OWASP compliance
- **Decision**: Backend auth layer only
- **Action**: Move to `backend/auth/`
- **Recommendation**: Create `apps/backend/.claude/rules/auth-security.md`

---

### ⚠️ KEEP IN PROJECT ROOT (But Simplify)

**90_monorepo-structure.md**

- **Scope**: pnpm workspaces, package naming, import conventions
- **Decision**: Project-wide (affects backend, frontend, packages)
- **Action**: Keep in `sentinel/.claude/rules/` but simplify
- **Recommendation**: Extract verbose examples, keep core rules

---

## Global CLAUDE.md Analysis

### ✅ KEEP GLOBAL

- Context7 MCP integration patterns
- Forbidden directories pattern
- Quick setup checklist (python command, line endings, permissions)
- Common commands table format

### ❌ MOVE TO PROJECT

- Project-specific commands (pnpm test, pnpm build)
- Specific package manager preference (bun vs pnpm)

---

## Project CLAUDE.md Analysis

### ✅ KEEP IN PROJECT ROOT

- Architecture overview
- Tech stack table
- Quick commands
- Git workflow (protected branches)
- Standards summary
- Specialized agents
- Architecture decisions table

### ❌ PUSH DOWN TO LAYERS

- Testing standards → Reference `apps/backend/.claude/rules/testing.md`
- Database patterns → Reference `apps/backend/.claude/rules/database.md`
- Auth/security → Reference `apps/backend/.claude/rules/auth-security.md`

---

## Recommended Actions

### Phase 1: Extract Universal Rules (Keep Global)

**File**: `~/.claude/rules/core-principles.md`

```markdown
# Core Development Principles

## File Operations

- ALWAYS read files before editing (Edit tool requires prior Read)
- When editing multiple files, read once then batch edits

## Code Standards

- NEVER use `any` type—look up actual types
- ALWAYS throw errors early—no fallbacks
- Delegate complex tasks to subagents

## Tool Usage

- Use specialized tools: Read > cat, Grep > grep, Glob > find
- Only use bash when specialized tools can't handle it
```

**Update**: `~/.claude/CLAUDE.md`

- Keep: Forbidden directories, Context7 patterns, platform notes (WSL2/Linux)
- Remove: Project-specific commands

---

### Phase 2: Move to Project Refactor Folder

**Backend-Specific** (`backend/`):

- `testing-standards.md` (from project rules)
- `database-patterns.md` (from project rules)
- `auth-security.md` (from project rules)

**General Project-Wide** (`general/`):

- `git-workflow.md` (from global rules)
- `testing-strategy.md` (from global rules)
- `json-validation.md` (from global rules)
- `monorepo-structure.md` (from project rules, simplified)

**Procedural/Verbose** (`procedural/`):

- `releases.md` (from global rules)
- `markdown-delegation.md` (from global rules)
- `project-setup.md` (from global rules)
- `git-operations.md` (from global rules)
- `modern-tools-usage.md` (from global rules)
- `agents-skills.md` (from global rules)
- `project-structure.md` (from global rules)

---

### Phase 3: Create Layer-Specific CLAUDE.md Files

**`apps/backend/.claude/CLAUDE.md`**

```markdown
# Backend Layer Rules

See rules/ subdirectory for detailed patterns:

- testing.md - Vitest, Testcontainers, Supertest
- database.md - Prisma, Kysely, migrations
- auth-security.md - better-auth, API keys, OWASP

These rules ONLY apply to backend code.
```

**`apps/backend/.claude/rules/testing.md`**

- Extract from `10_testing-standards.md`
- Keep only backend-specific patterns

**`apps/backend/.claude/rules/database.md`**

- Extract from `20_database-patterns.md`
- Keep only database layer patterns

**`apps/backend/.claude/rules/auth-security.md`**

- Extract from `30_auth-security.md`
- Keep only auth layer patterns

---

## Summary Statistics

**Global Rules (10 files)**

- ✅ Keep: 1 file (extract universal principles)
- ❌ Move to project: 9 files

**Project Rules (4 files)**

- ✅ Keep in project root: 1 file (monorepo, simplified)
- ❌ Push down to backend layer: 3 files

**Total Files to Reorganize**: 12 files
**New Structure**:

- Global: 1 core principles file + updated CLAUDE.md
- Project refactor folder: 12 files (for review/organization)
- Backend layer: 3 rules files (after Phase 3)
