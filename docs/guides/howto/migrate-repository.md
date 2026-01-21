---
type: howto
title: "How to Migrate a Repository from Develop Branch"
status: published
created: 2026-01-20
last_updated: 2026-01-20
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - migrate repository
    - extract repository
    - develop branch
    - rebuild
  token_budget: 1000
goal: "Migrate an existing repository from develop branch to rebuild branch"
difficulty: medium
estimated_time: "45-60 minutes"
prerequisites:
  - Git basics
  - Understanding of Repository Pattern
  - TypeScript knowledge
related_tasks:
  - How to Add a Repository
  - How to Fix Bun Compatibility Issues
---

# How to Migrate a Repository from Develop Branch

**Goal:** Extract and update repository from develop branch to match rebuild architecture

**Difficulty:** Medium

**Time:** ~45-60 minutes

**Prerequisites:**
- Git access to develop branch
- Understanding of [Repository Pattern](../explanation/repository-pattern.md)
- Familiarity with TypeScript strict mode

---

## When to Use This Guide

**Use this guide when you need to:**
- Port repository from old codebase to new architecture
- Update repository to use dependency injection
- Migrate from Bun-specific code to Node.js
- Adapt repository to new package structure

**Don't use this guide for:**
- Creating new repository from scratch → Use [How to Add Repository](add-repository.md)
- Modifying existing rebuild repository → Edit directly

---

## Quick Solution

**For experienced users:**

```bash
# 1. Extract file from develop
git show origin/develop:backend/src/db/repositories/my-repo.ts > apps/backend/src/repositories/my-repo.ts

# 2. Update imports and add dependency injection
# 3. Replace all `prisma.` with `this.prisma.`
# 4. Remove Bun-specific code
# 5. Fix TypeScript strict mode errors
# 6. Write integration tests
# 7. Verify coverage ≥ 90%
```

**For detailed walkthrough, continue reading.**

---

## Prerequisites Check

Before starting, verify you have:

- [ ] Access to develop branch
  ```bash
  git fetch origin develop
  ```
  Expected: "From github.com:DeadshotOMEGA/sentinel"

- [ ] Repository exists in develop
  ```bash
  git show origin/develop:backend/src/db/repositories/ | grep my-repo
  ```
  Expected: Filename appears

- [ ] New package structure set up
  ```bash
  ls apps/backend/src/repositories/
  ```
  Expected: Directory exists

---

## Step-by-Step Instructions

### Step 1: Extract Repository from Develop

**What:** Copy repository file from develop branch to rebuild

**Why:** Preserves existing business logic while allowing updates

**How:**

```bash
# Extract file (adjust path for your repository)
git show origin/develop:backend/src/db/repositories/member-repository.ts > \
  apps/backend/src/repositories/member-repository.ts
```

**Expected result:**
File created in `apps/backend/src/repositories/`

**Troubleshooting:**
- If "fatal: Path not in develop", check exact path with `git ls-tree -r --name-only origin/develop | grep repository`
- If empty file, verify branch name is correct

---

### Step 2: Update Imports

**What:** Change imports to use new package structure

**Why:** Old imports referenced different paths and packages

**How:**

Replace old imports:
```typescript
// ❌ OLD (develop branch)
import { prisma } from '@/db/prisma'
import { Member } from '@prisma/client'
import type { CreateMemberInput } from '@/types/member'
```

With new imports:
```typescript
// ✅ NEW (rebuild)
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Member, Prisma } from '@prisma/client'
import type { CreateMemberInput } from '@sentinel/types'
```

**Expected result:**
All imports use `@sentinel/` packages

---

### Step 3: Add Dependency Injection

**What:** Add constructor with optional PrismaClient parameter

**Why:** Enables testing with test database

**How:**

Before (develop branch):
```typescript
// ❌ OLD - no dependency injection
export class MemberRepository {
  async findById(id: string) {
    return await prisma.member.findUnique({ where: { id } })
  }
}
```

After (rebuild):
```typescript
// ✅ NEW - with dependency injection
export class MemberRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findById(id: string) {
    return await this.prisma.member.findUnique({ where: { id } })
  }
}
```

**Expected result:**
Repository has `private prisma` property and constructor

---

### Step 4: Replace Global `prisma` with `this.prisma`

**What:** Update all database calls to use injected client

**Why:** Critical for tests to work - global `prisma` won't use test database

**How:**

```bash
# Find all occurrences
grep -n "prisma\." apps/backend/src/repositories/member-repository.ts

# Auto-replace (review carefully!)
sed -i 's/await prisma\./await this.prisma./g' apps/backend/src/repositories/member-repository.ts
sed -i 's/ prisma\./ this.prisma./g' apps/backend/src/repositories/member-repository.ts

# Manual check - ensure no 'prisma.' remains except in comments
grep -n "prisma\." apps/backend/src/repositories/member-repository.ts | grep -v "this.prisma" | grep -v "//"
```

**Expected result:**
Zero results from final grep (all `prisma.` are now `this.prisma.`)

**Critical:** Check inside `Promise.all`:
```typescript
// ❌ WRONG
const [total, items] = await Promise.all([
  prisma.member.count(),  // Missing this.
  prisma.member.findMany()  // Missing this.
])

// ✅ CORRECT
const [total, items] = await Promise.all([
  this.prisma.member.count(),
  this.prisma.member.findMany()
])
```

---

### Step 5: Remove Bun-Specific Code

**What:** Replace Bun runtime features with Node.js equivalents

**Why:** Rebuild uses Node.js runtime, not Bun

**How:**

**Pattern 1: Bun.sleep → setTimeout**
```typescript
// ❌ OLD (Bun)
await Bun.sleep(1000)

// ✅ NEW (Node.js)
await new Promise(resolve => setTimeout(resolve, 1000))
```

**Pattern 2: Bun.password → bcrypt**
```typescript
// ❌ OLD (Bun)
const hash = await Bun.password.hash(password)

// ✅ NEW (Node.js with better-auth)
// Don't hash manually - use better-auth
await auth.api.signUp({ password: 'raw-password' })
```

**Pattern 3: Bun.file → fs/promises**
```typescript
// ❌ OLD (Bun)
const file = Bun.file('./data.json')
const data = await file.json()

// ✅ NEW (Node.js)
import { readFile } from 'fs/promises'
const data = JSON.parse(await readFile('./data.json', 'utf-8'))
```

**Expected result:**
No `Bun.` references in code

---

### Step 6: Fix TypeScript Strict Mode Errors

**What:** Resolve type errors introduced by strict mode

**Why:** Rebuild uses TypeScript strict mode for better type safety

**How:**

**Common Fix 1: Implicit `any`**
```typescript
// ❌ Error: Parameter 'data' implicitly has an 'any' type
function process(data) {
  return data.value
}

// ✅ Fixed
function process(data: { value: string }) {
  return data.value
}
```

**Common Fix 2: Potentially `null`**
```typescript
// ❌ Error: Object is possibly 'null'
const member = await this.prisma.member.findUnique({ where: { id } })
return member.name  // Error!

// ✅ Fixed - Option 1: Null check
const member = await this.prisma.member.findUnique({ where: { id } })
if (!member) throw new Error('Member not found')
return member.name

// ✅ Fixed - Option 2: Non-null assertion (only if you're certain)
const member = await this.prisma.member.findUnique({ where: { id } })
return member!.name  // Use sparingly
```

**Common Fix 3: Missing return type**
```typescript
// ❌ Error: Function lacks return type annotation
async findAll() {
  return await this.prisma.member.findMany()
}

// ✅ Fixed
async findAll(): Promise<Member[]> {
  return await this.prisma.member.findMany()
}
```

**Expected result:**
```bash
pnpm tsc --noEmit
# No errors
```

---

### Step 7: Write Integration Tests

**What:** Create comprehensive test file

**Why:** Ensures migration didn't break functionality and meets coverage requirements

**How:**

```bash
touch apps/backend/tests/integration/repositories/member-repository.test.ts
```

See [How to Add Repository - Step 5](add-repository.md#step-5-create-integration-tests) for complete test template.

**Minimum test coverage:**
- All CRUD operations (create, read, update, delete)
- Error cases (not found, duplicates, FK violations)
- Filtering and search
- Pagination (if applicable)
- Relationships (if applicable)

**Expected result:**
90%+ coverage on repository

---

### Step 8: Verify Migration

**What:** Run tests and verify functionality

**Why:** Confirms migration is complete and correct

**How:**

```bash
# Run repository tests
pnpm test member-repository.test.ts

# Check coverage
pnpm test member-repository.test.ts --coverage

# Type check
pnpm tsc --noEmit

# Lint
pnpm lint apps/backend/src/repositories/member-repository.ts
```

**Expected result:**
```
✓ All tests passing
✓ Coverage ≥ 90%
✓ No TypeScript errors
✓ No lint errors
```

---

## Complete Example

**Before (develop branch):**
```typescript
// backend/src/db/repositories/member-repository.ts
import { prisma } from '@/db/prisma'
import type { Member } from '@prisma/client'

export class MemberRepository {
  async findById(id: string) {
    const member = await prisma.member.findUnique({ where: { id } })
    return member
  }

  async create(data) {  // Implicit any
    return await prisma.member.create({ data })
  }
}
```

**After (rebuild branch):**
```typescript
// apps/backend/src/repositories/member-repository.ts
import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Member, Prisma } from '@prisma/client'

export class MemberRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findById(id: string): Promise<Member | null> {
    return await this.prisma.member.findUnique({ where: { id } })
  }

  async create(data: Prisma.MemberCreateInput): Promise<Member> {
    return await this.prisma.member.create({ data })
  }
}
```

---

## Migration Checklist

Use this checklist to verify migration is complete:

- [ ] File extracted from develop branch
- [ ] Imports updated to `@sentinel/` packages
- [ ] Dependency injection constructor added
- [ ] `private prisma: PrismaClient` property added
- [ ] All `prisma.` changed to `this.prisma.`
- [ ] Verified no `prisma.` in Promise.all
- [ ] Bun-specific code removed
- [ ] TypeScript strict mode errors fixed
- [ ] Integration tests created
- [ ] Test coverage ≥ 90%
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No lint errors

---

## Troubleshooting

### Problem: "password authentication failed for user 'placeholder'"

**Symptoms:**
Tests fail even though code looks correct

**Cause:**
Missed a `prisma.` that should be `this.prisma.`

**Solution:**
```bash
# Find the culprit
grep -n " prisma\." apps/backend/src/repositories/member-repository.ts | grep -v "this.prisma"

# Common hiding spots:
# - Inside Promise.all
# - Inside transactions
# - Inside arrow functions
```

---

### Problem: Import errors after migration

**Symptoms:**
Cannot find module '@sentinel/database'

**Solution:**
```bash
# Rebuild database package
cd packages/database
pnpm build

# Reinstall dependencies at root
cd ../..
pnpm install
```

---

### Problem: Tests fail with "container removal already in progress"

**Symptoms:**
Testcontainers error on startup

**Solution:**
```bash
# Usually resolves on retry
pnpm test member-repository.test.ts

# If persistent, force remove containers
docker ps -a | grep postgres
docker rm -f <container-id>
```

---

## Best Practices

**✅ Do:**
- Extract file using `git show` (preserves history reference)
- Update all imports before fixing code
- Use sed for bulk replacements but verify manually
- Test after each major change
- Write tests before marking migration complete
- Document any behavior changes in commit message

**❌ Don't:**
- Copy-paste from IDE (loses develop branch reference)
- Skip TypeScript strict mode fixes
- Leave any `Bun.` references
- Mix multiple repository migrations in one PR
- Skip integration tests
- Mark migration done with <90% coverage

---

## Related Tasks

**Before this task:**
- [Verify entity in Prisma schema](../../../packages/database/prisma/schema.prisma)
- [Ensure packages built](../reference/commands.md#building)

**After this task:**
- [Create routes using migrated repository](../howto/add-route.md)
- [Update API contracts](../../../packages/contracts/CLAUDE.md)

**Similar tasks:**
- [How to Add a Repository](add-repository.md)
- [How to Fix TypeScript Errors](../reference/typescript-migration.md)

---

## Related Documentation

**How-to Guides:**
- [How to Add a Repository](add-repository.md)

**Reference:**
- [Repository Patterns](../reference/repository-patterns.md)
- [Troubleshooting Repositories](../reference/troubleshooting-repositories.md)

**Explanation:**
- [Repository Pattern Explained](../explanation/repository-pattern.md)

**Code:**
- [Completed migrations](../../../apps/backend/src/repositories/)

---

**Last Updated:** 2026-01-20
