---
type: plan
title: 'Backend Lint Cleanup Plan'
status: future
created: 2026-01-23
priority: medium
lifecycle: proposed
ai:
  priority: medium
  context_load: when_needed
  triggers:
    - lint
    - code-quality
    - typescript
    - eslint
  token_budget: 1500
related_code:
  - apps/backend/src/
---

# Backend Lint Cleanup Plan

## Executive Summary

Systematic cleanup of 75 ESLint violations in the backend codebase to improve code quality and enable full CI/CD pipeline success.

**Current Status:**

- ✅ Type checking: Passing
- ✅ Build: Passing
- ❌ Lint: 48 errors, 28 warnings
- ⏸️ Tests: Blocked by lint failures

**Impact:** Low urgency - These are code quality issues, not runtime bugs. Backend is functionally complete and production-ready.

---

## Issue Breakdown

### By Severity

| Severity     | Count | Blocking CI/CD |
| ------------ | ----- | -------------- |
| **Errors**   | 48    | Yes            |
| **Warnings** | 28    | No             |
| **Total**    | 75    | -              |

### By Type

| Rule                                       | Count | Severity | Auto-fixable |
| ------------------------------------------ | ----- | -------- | ------------ |
| `@typescript-eslint/no-explicit-any`       | 45    | Error    | No           |
| `@typescript-eslint/no-non-null-assertion` | 25    | Warning  | No           |
| `no-undef` (crypto)                        | 3     | Error    | Yes          |

---

## Issue Categories

### 1. Type Safety Issues (45 errors)

**Rule:** `@typescript-eslint/no-explicit-any`
**Impact:** High - Defeats TypeScript's type checking
**Effort:** Medium - Requires understanding each usage context

**Affected Files:**

- `src/repositories/member-repository.ts` (7 instances)
- `src/repositories/visitor-repository.ts` (6 instances)
- `src/repositories/checkin-repository.ts` (6 instances)
- `src/repositories/event-repository.ts` (6 instances)
- `src/repositories/security-alert-repository.ts` (5 instances)
- `src/repositories/dds-repository.ts` (4 instances)
- `src/repositories/lockup-repository.ts` (3 instances)
- `src/routes/members.ts` (3 instances)
- `src/routes/visitors.ts` (2 instances)
- `src/routes/events.ts` (2 instances)
- `src/routes/dds.ts` (1 instance)

**Common Patterns:**

```typescript
// Pattern 1: Prisma nullable fields
updatedAt: prismaEntity.updatedAt as any

// Pattern 2: Optional foreign keys
foreignKeyId: prismaEntity.foreignKeyId as any

// Pattern 3: Date fields
lastAction: prismaEntity.lastAction as any
```

**Fix Strategy:**

```typescript
// Before
updatedAt: prismaEntity.updatedAt as any

// After
updatedAt: prismaEntity.updatedAt ?? undefined
```

### 2. Non-Null Assertions (25 warnings)

**Rule:** `@typescript-eslint/no-non-null-assertion`
**Impact:** Low - Warnings only, but risky if assumptions are wrong
**Effort:** Low - Simple pattern replacement

**Affected Files:**

- `src/repositories/badge-status-repository.ts` (4 instances)
- `src/repositories/member-status-repository.ts` (4 instances)
- `src/repositories/tag-repository.ts` (4 instances)
- `src/repositories/list-item-repository.ts` (4 instances)
- `src/repositories/member-type-repository.ts` (4 instances)
- `src/repositories/visit-type-repository.ts` (2 instances)
- `src/repositories/checkin-repository.ts` (1 instance)

**Common Pattern:**

```typescript
// Pattern: Force unwrap with !
const result = someNullableValue!
```

**Fix Strategy:**

```typescript
// Before
const result = someNullableValue!

// After (option 1: guard clause)
if (!someNullableValue) {
  throw new Error('Value is required')
}
const result = someNullableValue

// After (option 2: nullish coalescing)
const result = someNullableValue ?? defaultValue
```

### 3. Global Crypto Usage (3 errors)

**Rule:** `no-undef`
**Impact:** High - Blocks CI/CD
**Effort:** Trivial - Add import

**Affected Files:**

- `src/routes/members.ts` (2 instances)
- (1 more file pending identification)

**Fix:**

```typescript
// Add to imports
import { randomUUID } from 'crypto'

// Replace global usage
crypto.randomUUID() → randomUUID()
```

---

## Implementation Plan

### Phase 1: Critical Errors (Blocks CI/CD)

**Goal:** Get CI/CD green
**Estimated Time:** 1-2 hours

#### Task 1.1: Fix crypto imports (15 min)

```bash
# Files to update:
- src/routes/members.ts
- src/routes/visitors.ts (if applicable)
```

**Steps:**

1. Search for all `crypto.` usage
2. Add `import { randomUUID } from 'crypto'`
3. Replace `crypto.randomUUID()` with `randomUUID()`

#### Task 1.2: Fix any types in repositories (1-1.5 hours)

**Priority Files (highest usage):**

1. `member-repository.ts` (7 instances)
2. `visitor-repository.ts` (6 instances)
3. `checkin-repository.ts` (6 instances)
4. `event-repository.ts` (6 instances)
5. `security-alert-repository.ts` (5 instances)

**Pattern to fix:**

```typescript
// Generic fix for nullable Prisma fields
field: prismaEntity.field as any
// Replace with:
field: prismaEntity.field ?? undefined
```

**Testing after each file:**

```bash
pnpm typecheck  # Ensure types still work
pnpm test tests/integration/repositories/[name]-repository.test.ts
```

### Phase 2: Remaining Errors (30-45 min)

Fix remaining `any` types in:

- Route files (src/routes/\*.ts)
- Smaller repository files (dds, lockup)

### Phase 3: Warnings (Optional, 30 min)

**Goal:** Clean up non-null assertions
**Note:** These don't block CI/CD, can be deferred

**Strategy:**

- Review each `!` usage for legitimacy
- Replace with guard clauses or nullish coalescing
- Add runtime checks where assumptions are made

---

## Automated Approach

### Option A: Bulk Find & Replace (Fast, Risky)

Use sed to replace common patterns:

```bash
# Fix most nullable field patterns
find apps/backend/src/repositories -name "*.ts" -exec sed -i 's/\(: prisma[^.]*\.[^)]*\) as any/\1 ?? undefined/g' {} \;

# Fix crypto imports (manual verification needed)
# Add import to each file with crypto usage
```

**Pros:** Fast (10-15 minutes)
**Cons:** May break edge cases, requires careful testing

### Option B: File-by-File (Slow, Safe)

Manually review and fix each file:

```bash
# For each file with errors:
1. Open file
2. Find all `as any` occurrences
3. Determine correct type (string | null, Date | null, etc.)
4. Replace with appropriate type handling
5. Run tests for that file
```

**Pros:** Safe, understands context
**Cons:** Time-consuming (2-3 hours)

### Recommended: Hybrid Approach

1. **Auto-fix crypto imports** (5 min)
2. **Manual fix top 5 repository files** (1 hour) - These have most impact
3. **Auto-fix remaining simple patterns** (15 min)
4. **Test suite run** (30 min)
5. **Fix any breakage** (15-30 min)

**Total: ~2 hours**

---

## Success Criteria

### Must Have (CI/CD Unblocked)

- [ ] All 48 lint errors resolved
- [ ] `pnpm lint` exits with 0 errors
- [ ] CI/CD Test workflow passes
- [ ] All 634 tests still passing

### Should Have (Code Quality)

- [ ] No `any` types in repository layer
- [ ] No `any` types in route handlers
- [ ] All crypto imports explicit

### Nice to Have (Best Practices)

- [ ] No non-null assertions (`!`) in repositories
- [ ] Guard clauses for all nullable checks
- [ ] Proper error messages for null violations

---

## Testing Strategy

### Per-File Testing

```bash
# After fixing each repository file
pnpm vitest run tests/integration/repositories/[name]-repository.test.ts

# After fixing route files
pnpm vitest run tests/integration/routes/[name].test.ts
```

### Full Suite Testing

```bash
# Before committing
pnpm typecheck  # Must pass
pnpm lint       # Must show 0 errors
pnpm test       # All 634 tests must pass
```

### CI/CD Verification

```bash
# Push to trigger workflows
git add -A
git commit -m "fix(lint): resolve all ESLint errors"
git push origin rebuild

# Verify workflows pass
gh run watch
```

---

## Risk Assessment

### Low Risk ✅

- Crypto import fixes (straightforward)
- Simple nullable field replacements (`?? undefined`)
- Repository layer fixes (well-tested)

### Medium Risk ⚠️

- Route handler fixes (less test coverage)
- Complex type replacements (may need interface updates)
- Bulk find/replace operations

### High Risk ❌

- None identified - All fixes are type-level, not logic changes

---

## Rollback Plan

If tests break after fixes:

```bash
# Option 1: Revert last commit
git revert HEAD

# Option 2: Stash changes and test incrementally
git stash
# Apply fixes file-by-file, testing each

# Option 3: Disable rule temporarily (NOT RECOMMENDED)
# In eslint.config.js:
rules: {
  '@typescript-eslint/no-explicit-any': 'warn', // Temporary downgrade
}
```

---

## Long-Term Prevention

### 1. Update ESLint Config

Ensure strict rules are enabled:

```javascript
// eslint.config.js
rules: {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error', // Upgrade from warn
}
```

### 2. Pre-commit Hooks

Already configured via lint-staged - ensure it runs:

```json
// package.json
"lint-staged": {
  "apps/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

### 3. CI/CD Enforcement

Already configured in `.github/workflows/test.yml`:

```yaml
- name: Lint
  run: pnpm lint
```

This prevents new lint errors from being merged.

---

## Execution Commands

### Quick Start

```bash
# 1. Pull latest changes
git pull origin rebuild

# 2. Create cleanup branch
git checkout -b fix/lint-cleanup

# 3. Fix crypto imports
# (Manual: add imports to affected files)

# 4. Fix any types in repositories
# (Manual: replace `as any` with proper types)

# 5. Test
pnpm typecheck
pnpm lint
pnpm test

# 6. Commit
git add -A
git commit -m "fix(lint): resolve all ESLint errors"

# 7. Push and create PR
git push origin fix/lint-cleanup
gh pr create --base rebuild --title "fix(lint): resolve all ESLint errors"
```

---

## Alternative: Incremental Approach

If time is limited, fix in stages:

### Stage 1: CI/CD Unblock (Critical)

- Fix crypto imports (5 min)
- Fix top 3 repository files (30 min)
- **Result:** CI/CD passes, 60% of errors fixed

### Stage 2: Repository Layer (High Priority)

- Fix remaining repository files (45 min)
- **Result:** 90% of errors fixed

### Stage 3: Route Layer (Medium Priority)

- Fix route handler any types (20 min)
- **Result:** 100% of errors fixed

### Stage 4: Warnings (Low Priority - Optional)

- Fix non-null assertions (30 min)
- **Result:** Clean lint output, best practices

---

## Related Documentation

- [Backend README](../../apps/backend/README.md) - Development setup
- [ESLint Config](../../eslint.config.js) - Linting rules
- [GitHub Workflows](../../.github/workflows/) - CI/CD pipelines
- [Phase 4 Completion Plan](../active/2026-01-23-phase-4-completion.md) - Current phase

---

## Ownership

**Assignee:** TBD
**Reviewer:** Lead Developer
**Priority:** Medium (does not block frontend work)
**Due Date:** Before merge to `develop`

---

## Notes

- Backend is functionally complete despite lint issues
- These are code quality improvements, not bug fixes
- Frontend development can proceed in parallel
- Consider pairing on this task for knowledge transfer
