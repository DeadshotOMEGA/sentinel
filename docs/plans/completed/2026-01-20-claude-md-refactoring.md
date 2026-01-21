---
type: plan
title: "CLAUDE.md Refactoring Plan"
status: published
created: 2026-01-20
last_updated: 2026-01-20
lifecycle: completed
completion_date: 2026-01-20
session_report: docs/sessions/2026-01-20-claude-md-refactoring-completion.md
---

# CLAUDE.md Refactoring Plan

**STATUS: ✅ COMPLETE** (2026-01-20)

Comprehensive plan to refactor all CLAUDE.md files in Sentinel project to follow the Rules Authoring Standard.

**Completion Summary**: Successfully refactored 34 CLAUDE.md files, reducing total line count by 73.7% (from ~13,400 to 3,526 lines). All files passed validation. See [session report](2026-01-20-claude-md-refactoring-completion.md) for complete details.

## Overview

**Goal**: Convert 35 CLAUDE.md files from mixed documentation/rules to pure constraint files following Rules Authoring Standard.

**Current State**:
- 35 CLAUDE.md files across project
- Most mix documentation with constraints
- Many exceed 600-token target
- Root CLAUDE.md recently refactored (✅ template)

**Target State**:
- All CLAUDE.md files follow Rules Authoring Standard template
- Only constraints (MUST/MUST NOT/SHOULD)
- 200-600 token target
- Documentation extracted to docs/

**Validation**: `.claude/hooks/claudemd-linter.js` hook enforces structure

---

## File Inventory (35 files)

### Root Level (1 file)
```
./CLAUDE.md ✅ COMPLETE (recently refactored)
```

### Apps (6 files)
```
apps/backend/CLAUDE.md                        ⚠️ REFACTOR (257 lines, mixed content)
├── apps/backend/tests/CLAUDE.md              ⏳ REVIEW
├── apps/backend/src/lib/CLAUDE.md            ⏳ REVIEW
├── apps/backend/src/middleware/CLAUDE.md     ⏳ REVIEW
├── apps/backend/src/routes/CLAUDE.md         ⏳ REVIEW
└── apps/backend/src/repositories/CLAUDE.md   ⚠️ MAJOR REFACTOR (1045 lines!)
```

### Packages (4 files)
```
packages/database/CLAUDE.md                   ⚠️ REFACTOR (495 lines, technical docs)
├── packages/database/prisma/CLAUDE.md        ⏳ REVIEW
└── packages/database/src/CLAUDE.md           ⏳ REVIEW
packages/contracts/CLAUDE.md                  ⏳ REVIEW
```

### Docs (24 files)
```
docs/CLAUDE.md                                ✅ GOOD (AI-first navigation)
├── docs/concepts/CLAUDE.md                   ⏳ REVIEW
├── docs/decisions/CLAUDE.md                  ⏳ REVIEW
│   ├── docs/decisions/adr/CLAUDE.md          ⏳ REVIEW
│   └── docs/decisions/rfc/CLAUDE.md          ⏳ REVIEW
├── docs/domains/CLAUDE.md                    ⏳ REVIEW
│   ├── docs/domains/authentication/CLAUDE.md ⏳ REVIEW
│   ├── docs/domains/checkin/CLAUDE.md        ⏳ REVIEW
│   ├── docs/domains/events/CLAUDE.md         ⏳ REVIEW
│   └── docs/domains/personnel/CLAUDE.md      ⏳ REVIEW
├── docs/cross-cutting/CLAUDE.md              ⏳ REVIEW
│   ├── docs/cross-cutting/deployment/CLAUDE.md   ⏳ REVIEW
│   ├── docs/cross-cutting/monitoring/CLAUDE.md   ⏳ REVIEW
│   └── docs/cross-cutting/testing/CLAUDE.md      ⏳ REVIEW
├── docs/guides/CLAUDE.md                     ✅ GOOD (Diátaxis guide)
│   ├── docs/guides/explanation/CLAUDE.md     ⏳ REVIEW
│   ├── docs/guides/howto/CLAUDE.md           ⏳ REVIEW
│   ├── docs/guides/reference/CLAUDE.md       ⏳ REVIEW
│   └── docs/guides/tutorials/CLAUDE.md       ⏳ REVIEW
├── docs/meta/CLAUDE.md                       ⏳ REVIEW
├── docs/plans/CLAUDE.md                      ⏳ REVIEW
├── docs/research/CLAUDE.md                   ⏳ REVIEW
├── docs/sessions/CLAUDE.md                   ⏳ REVIEW
└── docs/templates/CLAUDE.md                  ⏳ REVIEW
```

---

## Hierarchy Analysis

### Tree Structure with Depth

**Level 1** (Root):
- `./CLAUDE.md` ✅

**Level 2** (Top-level packages/apps/docs):
- `apps/backend/CLAUDE.md`
- `packages/database/CLAUDE.md`
- `packages/contracts/CLAUDE.md`
- `docs/CLAUDE.md` ✅

**Level 3** (Subdirectories):
- `apps/backend/tests/CLAUDE.md`
- `apps/backend/src/lib/CLAUDE.md`
- `apps/backend/src/middleware/CLAUDE.md`
- `apps/backend/src/routes/CLAUDE.md`
- `apps/backend/src/repositories/CLAUDE.md`
- `packages/database/prisma/CLAUDE.md`
- `packages/database/src/CLAUDE.md`
- `docs/concepts/CLAUDE.md`
- `docs/decisions/CLAUDE.md`
- `docs/domains/CLAUDE.md`
- `docs/cross-cutting/CLAUDE.md`
- `docs/guides/CLAUDE.md` ✅
- `docs/meta/CLAUDE.md`
- `docs/plans/CLAUDE.md`
- `docs/research/CLAUDE.md`
- `docs/sessions/CLAUDE.md`
- `docs/templates/CLAUDE.md`

**Level 4** (Deep subdirectories):
- `docs/decisions/adr/CLAUDE.md`
- `docs/decisions/rfc/CLAUDE.md`
- `docs/domains/authentication/CLAUDE.md`
- `docs/domains/checkin/CLAUDE.md`
- `docs/domains/events/CLAUDE.md`
- `docs/domains/personnel/CLAUDE.md`
- `docs/cross-cutting/deployment/CLAUDE.md`
- `docs/cross-cutting/monitoring/CLAUDE.md`
- `docs/cross-cutting/testing/CLAUDE.md`
- `docs/guides/explanation/CLAUDE.md`
- `docs/guides/howto/CLAUDE.md`
- `docs/guides/reference/CLAUDE.md`
- `docs/guides/tutorials/CLAUDE.md`

### Potential Duplication Issues

**Same Tree Branches**:
1. `apps/backend/` → `apps/backend/src/` → `apps/backend/src/repositories/`
   - Risk: General backend rules duplicated in repository-specific file
   - Strategy: Backend CLAUDE.md = general rules, repositories CLAUDE.md = repository-specific only

2. `packages/database/` → `packages/database/prisma/` + `packages/database/src/`
   - Risk: Database connection rules duplicated across 3 files
   - Strategy: Top-level = package rules, prisma/ = schema rules, src/ = query patterns

3. `docs/guides/` → 4 subdirectories (tutorials, howto, reference, explanation)
   - Risk: Diátaxis classification rules duplicated in each subdirectory
   - Strategy: guides/ = classification rules, subdirectories = type-specific rules only

4. `docs/domains/` → 4 domain subdirectories
   - Risk: General domain documentation rules duplicated
   - Strategy: domains/ = general domain rules, subdomains = domain-specific only

5. `docs/cross-cutting/` → 3 concern subdirectories
   - Risk: General cross-cutting rules duplicated
   - Strategy: cross-cutting/ = general rules, subdirectories = concern-specific only

---

## Refactoring Strategy

### Principles

1. **Top-Down Approach**: Start from deepest files, extract upward
2. **Extract Documentation First**: Create docs before deleting from CLAUDE.md
3. **Validate After Each**: Run linter hook to ensure compliance
4. **Prevent Duplication**: Parent file = general rules, child file = additions only
5. **Token Budget**: Aim for 200-600 tokens per file

### Rule Scoping Guidelines

**Ask for each rule**: "Is this rule ALWAYS true for EVERY file in this directory and all subdirectories?"

- ✅ YES → Keep in this CLAUDE.md
- ❌ NO, only true for subdirectory → Move to subdirectory CLAUDE.md
- ❌ NO, only true sometimes → Delete or rephrase to be absolute
- ❌ NO, it's documentation → Extract to docs/

**Example**:
```
In apps/backend/CLAUDE.md:
"MUST use dependency injection in repositories"
→ ❌ Only true for src/repositories/, move there

In apps/backend/CLAUDE.md:
"MUST use Express framework for routes"
→ ✅ True for all backend code, keep here
```

### Documentation Extraction Patterns

**Architecture/Tech Stack** → `docs/guides/reference/[area]-architecture.md`
**Commands** → `docs/guides/reference/commands.md`
**Patterns/Examples** → `docs/guides/howto/[task].md` or `docs/guides/explanation/[concept].md`
**Troubleshooting** → `docs/guides/reference/troubleshooting.md`
**Setup Guides** → `docs/guides/howto/setup-[area].md`

---

## Phase 1: High-Priority Refactors

### 1.1 apps/backend/src/repositories/CLAUDE.md (CRITICAL)

**Current**: 1045 lines of mixed rules, patterns, examples, troubleshooting
**Target**: 200-600 tokens of pure constraints

**Extract to**:
- `docs/guides/explanation/repository-pattern.md` - What repositories are, why we use them
- `docs/guides/howto/add-repository.md` - Step-by-step guide to creating new repository
- `docs/guides/howto/migrate-repository.md` - Migration from develop branch
- `docs/guides/reference/repository-patterns.md` - Common patterns (CRUD, pagination, transactions)
- `docs/guides/reference/troubleshooting-repositories.md` - Error messages and fixes

**Keep as rules**:
```markdown
## Non-Negotiables (MUST / MUST NOT)
- MUST use dependency injection (accept PrismaClient in constructor)
- MUST use this.prisma (NEVER global prisma)
- MUST NOT use global prisma in Promise.all
- MUST achieve 90%+ test coverage
- MUST use update (not updateMany) in transactions for rollback

## Defaults (SHOULD)
- SHOULD use standard repository template
- SHOULD test all error paths (not found, duplicates, FK violations)
```

**Estimated Reduction**: 1045 lines → ~150 lines (85% reduction)

### 1.2 packages/database/CLAUDE.md

**Current**: 495 lines of Prisma 7 technical documentation
**Target**: 200-400 tokens

**Extract to**:
- `docs/guides/reference/prisma-7-migration.md` - Prisma 7 adapter setup
- `docs/guides/explanation/prisma-adapter-pattern.md` - Why adapter is needed
- `docs/guides/howto/setup-database-client.md` - Client configuration
- `docs/guides/reference/troubleshooting-prisma.md` - Common errors

**Keep as rules**:
```markdown
## Non-Negotiables (MUST / MUST NOT)
- MUST use Prisma 7 with @prisma/adapter-pg
- MUST provide adapter to PrismaClient constructor
- MUST NOT use datasources config (Prisma 6 pattern)
- MUST set DATABASE_URL before importing client

## Defaults (SHOULD)
- SHOULD use singleton pattern for production
- SHOULD inject client for tests
```

**Estimated Reduction**: 495 lines → ~100 lines (80% reduction)

### 1.3 apps/backend/CLAUDE.md

**Current**: 257 lines of architecture, routes, commands
**Target**: 200-400 tokens

**Extract to**:
- `docs/guides/reference/backend-routes.md` - Complete route list (already exists partially in architecture.md)
- `docs/guides/reference/backend-middleware.md` - Middleware stack details
- Update `docs/guides/reference/architecture.md` with backend details
- Update `docs/guides/reference/commands.md` with backend-specific commands

**Keep as rules**:
```markdown
## Non-Negotiables (MUST / MUST NOT)
- MUST use Express + ts-rest for routes
- MUST use better-auth for authentication
- MUST follow middleware order in app.ts
- MUST use Winston logger with correlation IDs

## Defaults (SHOULD)
- SHOULD achieve 80%+ route test coverage
- SHOULD use integration-first testing
- SHOULD consult domain CLAUDE.md before changes
```

**Estimated Reduction**: 257 lines → ~120 lines (53% reduction)

---

## Phase 2: Medium-Priority Refactors

### 2.1 Docs Directory (24 files)

**Strategy**: Most docs/ CLAUDE.md files should be VERY small (navigation only)

**Pattern for docs/[category]/CLAUDE.md**:
```markdown
## Scope
Applies when creating documentation in: docs/[category]/

## Non-Negotiables (MUST / MUST NOT)
- MUST follow file naming conventions
- MUST include required frontmatter

## Defaults (SHOULD)
- SHOULD use templates from @docs/templates/
```

**Files to review**:
- ✅ `docs/CLAUDE.md` - Already good (AI-first navigation)
- ✅ `docs/guides/CLAUDE.md` - Already good (Diátaxis)
- ⏳ All other docs/ CLAUDE.md files - Likely need refactoring

### 2.2 Backend Subdirectories

**Files**:
- `apps/backend/tests/CLAUDE.md`
- `apps/backend/src/lib/CLAUDE.md`
- `apps/backend/src/middleware/CLAUDE.md`
- `apps/backend/src/routes/CLAUDE.md`

**Strategy**: Extract patterns/examples, keep only constraints

**Potential extractions**:
- Testing patterns → `docs/guides/howto/write-integration-tests.md`
- Auth setup → `docs/guides/howto/configure-auth.md`
- Middleware patterns → `docs/guides/reference/middleware-patterns.md`
- Route patterns → `docs/guides/howto/add-route.md`

### 2.3 Package Subdirectories

**Files**:
- `packages/database/prisma/CLAUDE.md`
- `packages/database/src/CLAUDE.md`
- `packages/contracts/CLAUDE.md`

**Strategy**: Keep schema/contract rules, extract usage patterns

---

## Phase 3: Validation & Cleanup

### 3.1 Run Linter on All Files

```bash
# Test each CLAUDE.md file
find . -name "CLAUDE.md" -type f | grep -v node_modules | while read file; do
  echo "Validating: $file"
  node .claude/hooks/claudemd-linter.js "$file"
done
```

### 3.2 Check for Duplication

**Manual review of rule overlap**:
1. List all rules from parent CLAUDE.md
2. Check if child CLAUDE.md repeats any
3. Remove duplicates from child
4. Ensure child only adds new constraints

**Example check**:
```bash
# Extract all MUST/MUST NOT from backend tree
rg "MUST" apps/backend/**/CLAUDE.md | sort | uniq -d
# Duplicates indicate overlap
```

### 3.3 Update Cross-References

After refactoring, update all `@` references:
- Root CLAUDE.md links to domain CLAUDE.md files
- Domain CLAUDE.md files link to extracted docs
- Ensure no broken links

---

## Implementation Workflow

### Per-File Workflow

**For each CLAUDE.md file**:

1. **Read current file**
   ```bash
   cat apps/backend/src/repositories/CLAUDE.md
   ```

2. **Identify rules vs documentation**
   - Rules = MUST/MUST NOT/SHOULD statements
   - Documentation = explanations, examples, commands, setup

3. **Extract documentation**
   - Create new files in docs/guides/
   - Move content
   - Add proper frontmatter

4. **Refactor CLAUDE.md**
   - Use Rules Authoring Standard template
   - Keep only constraints
   - Add links to extracted docs

5. **Validate**
   ```bash
   node .claude/hooks/claudemd-linter.js <path-to-file>
   ```

6. **Check duplication**
   - Compare with parent CLAUDE.md
   - Remove any duplicate rules
   - Ensure child only adds new constraints

7. **Update references**
   - Update parent CLAUDE.md if needed
   - Update docs/CLAUDE.md navigation

8. **Test**
   - Ensure AI can still find rules
   - Verify workflow sections work
   - Check Quick Reference links

### Batch Workflow

**Process files in this order** (deepest first):

1. **Level 4** (deepest):
   - docs/decisions/adr/
   - docs/decisions/rfc/
   - docs/domains/[all 4 subdomains]
   - docs/cross-cutting/[all 3 concerns]
   - docs/guides/[all 4 types]

2. **Level 3**:
   - apps/backend/tests/
   - apps/backend/src/lib/
   - apps/backend/src/middleware/
   - apps/backend/src/routes/
   - apps/backend/src/repositories/ ⚠️ PRIORITY
   - packages/database/prisma/
   - packages/database/src/
   - docs/concepts/, docs/decisions/, docs/domains/, docs/cross-cutting/, docs/meta/, docs/plans/, docs/research/, docs/sessions/, docs/templates/

3. **Level 2**:
   - apps/backend/
   - packages/database/ ⚠️ PRIORITY
   - packages/contracts/

4. **Level 1**:
   - ./CLAUDE.md ✅ (already done)

---

## Success Metrics

### Quantitative

- ✅ All 35 CLAUDE.md files pass linter
- ✅ All CLAUDE.md files < 600 tokens
- ✅ Zero duplicate rules between parent/child
- ✅ All extracted docs created with proper frontmatter

### Qualitative

- ✅ AI can quickly find constraints (no searching through docs)
- ✅ Documentation is discoverable through docs/CLAUDE.md
- ✅ Each CLAUDE.md is scannable in < 30 seconds
- ✅ New contributors understand what's required vs recommended

---

## Rollout Plan

### Week 1: High-Priority (Phase 1)
- Day 1-2: Refactor repositories CLAUDE.md (biggest impact)
- Day 3: Refactor database CLAUDE.md
- Day 4: Refactor backend CLAUDE.md
- Day 5: Validation + fixes

### Week 2: Medium-Priority (Phase 2)
- Day 1-2: Backend subdirectories (4 files)
- Day 3-4: Package subdirectories (3 files)
- Day 5: Validation + fixes

### Week 3: Docs Refactoring
- Day 1-2: Level 4 docs (13 files)
- Day 3-4: Level 3 docs (11 files)
- Day 5: Validation + fixes

### Week 4: Final Polish
- Day 1: Cross-reference validation
- Day 2: Duplication check
- Day 3: Documentation index updates
- Day 4: Integration testing
- Day 5: Final validation + completion

---

## Risks & Mitigations

### Risk: Breaking AI Context Loading

**Risk**: AI can't find rules after refactoring
**Mitigation**:
- Use Quick Reference sections with links
- Maintain @-reference pattern
- Test AI workflows after each batch

### Risk: Over-Extraction

**Risk**: Rules become too vague after extracting details
**Mitigation**:
- Keep critical constraints (MUST/MUST NOT)
- Extract only explanatory content
- Link to extracted docs for context

### Risk: Duplication Creep

**Risk**: Rules get duplicated during refactoring
**Mitigation**:
- Automated duplication check (grep)
- Manual review of parent/child pairs
- Principle: child only adds, never repeats

### Risk: Token Budget Creep

**Risk**: Files grow back over time
**Mitigation**:
- Linter hook warns at 6000 characters
- Regular audits (monthly)
- Document token budget in Rules Authoring Standard

---

## Appendix A: File Size Analysis

**Current file sizes** (estimated lines):
- repositories CLAUDE.md: 1045 lines ⚠️ CRITICAL
- database CLAUDE.md: 495 lines ⚠️ HIGH
- backend CLAUDE.md: 257 lines ⚠️ MEDIUM
- guides CLAUDE.md: 214 lines ✅ OK
- docs CLAUDE.md: ~500 lines ✅ OK (navigation hub)
- Other files: Unknown (need sampling)

**Target file sizes**:
- Max: 200-600 tokens (~100-300 lines)
- Ideal: 300 tokens (~150 lines)
- Quick Reference sections OK to be larger (navigation)

---

## Appendix B: Template Reference

**Standard CLAUDE.md Template**:
```markdown
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

## Quick Reference
- Links to docs
- Links to specialized agents
- Links to child CLAUDE.md files
```

**See**: @.claude/standards/rules-authoring.md

---

## Next Actions

**Immediate**:
1. Review and approve this plan
2. Start with repositories CLAUDE.md (biggest impact)
3. Create extraction docs in parallel
4. Validate with linter after each file

**Follow-up**:
- Schedule weekly refactoring sessions
- Track progress in this document
- Update completion status
- Create final audit checklist

---

**Last Updated**: 2026-01-20
**Status**: Draft (awaiting approval)
