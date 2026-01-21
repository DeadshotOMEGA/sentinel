---
type: reference
title: "Troubleshooting Repositories"
status: published
created: 2026-01-20
last_updated: 2026-01-20
ai:
  priority: high
  context_load: on-demand
  triggers:
    - repository error
    - prisma error
    - test failure
    - authentication failed
    - transaction rollback
  token_budget: 1000
version: "1.0.0"
stability: stable
related_refs:
  - Repository Patterns
  - Testing Guide
---

# Troubleshooting Repositories

**Version:** 1.0.0

**Stability:** Stable

**Quick Links:**
- [Authentication Errors](#authentication-errors)
- [Transaction Issues](#transaction-issues)
- [Type Errors](#type-errors)
- [Test Errors](#test-errors)
- [Performance Issues](#performance-issues)

---

## Overview

**What:** Solutions to common repository errors and issues

**Purpose:** Quick reference for diagnosing and fixing repository problems

**Use cases:**
- Debugging test failures
- Resolving authentication errors
- Fixing transaction rollback issues
- Improving query performance

---

## Authentication Errors

### Error: "password authentication failed for user 'placeholder'"

**Full Error:**
```
Error: password authentication failed for user "placeholder"
  at Connection.parseE (node_modules/pg/lib/connection.js:...)
```

**Symptoms:**
- Tests fail with authentication error
- Error mentions "placeholder" user
- Production code works, only tests fail

**Cause:**
Repository method using global `prisma` instead of `this.prisma`

**Diagnosis:**
```bash
# Find the problematic line
grep -n " prisma\." apps/backend/src/repositories/your-repository.ts | grep -v "this.prisma"
```

**Solution:**

**Quick fix:**
```bash
# Auto-replace (review changes!)
sed -i 's/await prisma\./await this.prisma./g' your-repository.ts
sed -i 's/ prisma\./ this.prisma./g' your-repository.ts
```

**Manual fix:**
```typescript
// ❌ WRONG - Uses global prisma
async findAll() {
  return await prisma.member.findMany()
}

// ✅ CORRECT - Uses injected prisma
async findAll() {
  return await this.prisma.member.findMany()
}
```

**Common hiding spots:**
1. **Inside Promise.all:**
   ```typescript
   // ❌ WRONG
   const [total, items] = await Promise.all([
     prisma.member.count(),
     prisma.member.findMany()
   ])

   // ✅ CORRECT
   const [total, items] = await Promise.all([
     this.prisma.member.count(),
     this.prisma.member.findMany()
   ])
   ```

2. **Inside transactions:**
   ```typescript
   // ❌ WRONG - Using global inside transaction
   await this.prisma.$transaction(async (tx) => {
     const member = await prisma.member.findUnique({ where: { id } })
     return tx.member.update({ where: { id }, data })
   })

   // ✅ CORRECT - Using tx parameter
   await this.prisma.$transaction(async (tx) => {
     const member = await tx.member.findUnique({ where: { id } })
     return tx.member.update({ where: { id }, data })
   })
   ```

3. **Inside arrow functions:**
   ```typescript
   // ❌ WRONG
   const items = members.map(async (m) => {
     return await prisma.badge.findMany({ where: { memberId: m.id } })
   })

   // ✅ CORRECT
   const items = members.map(async (m) => {
     return await this.prisma.badge.findMany({ where: { memberId: m.id } })
   })
   ```

**Prevention:**
- Always use `this.prisma` in repository methods
- Set up ESLint rule to catch `prisma.` usage

---

## Transaction Issues

### Error: Transaction Not Rolling Back

**Symptoms:**
- Transaction should rollback on error but doesn't
- Partial data committed despite errors
- Test data not cleaned up properly

**Cause:**
Using `updateMany` instead of `update` in transactions

**Explanation:**
- `updateMany` returns `{count: 0}` for non-existent records (no error)
- `update` throws `RecordNotFoundError` for non-existent records (triggers rollback)

**Solution:**

```typescript
// ❌ WRONG - Won't rollback on missing record
await this.prisma.$transaction(async (tx) => {
  for (const id of ids) {
    await tx.member.updateMany({  // Returns {count: 0} if not found
      where: { id },
      data: { status: 'ACTIVE' }
    })
  }
})

// ✅ CORRECT - Rolls back on missing record
await this.prisma.$transaction(async (tx) => {
  for (const id of ids) {
    await tx.member.update({  // Throws error if not found
      where: { id },
      data: { status: 'ACTIVE' }
    })
  }
})
```

**When to use each:**
- `update` - When you want rollback on missing records (transactions)
- `updateMany` - When you want to ignore missing records (bulk updates)

---

### Error: "database system is shutting down"

**Symptoms:**
- Tests fail intermittently
- Error about database shutting down
- Happens more often in CI

**Cause:**
Tests accessing container that's stopping

**Solution:**

1. **Check test lifecycle:**
   ```typescript
   // ✅ Ensure proper order
   beforeAll(async () => {
     await testDb.start()
   }, 60000)

   afterAll(async () => {
     await testDb.stop()  // Not too early
   })
   ```

2. **Avoid parallel test execution:**
   ```bash
   # Run sequentially if needed
   pnpm test --no-threads
   ```

3. **Increase timeout:**
   ```typescript
   beforeAll(async () => {
     await testDb.start()
   }, 90000)  // Increase if needed
   ```

---

## Type Errors

### Error: "Property does not exist on type 'PrismaClient'"

**Full Error:**
```
Property 'myEntity' does not exist on type 'PrismaClient'
```

**Cause:**
Prisma client not regenerated after schema changes

**Solution:**

```bash
# Regenerate Prisma client
cd packages/database
pnpm prisma generate

# Rebuild database package
pnpm build

# Restart TypeScript server in IDE
# VSCode: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

### Error: "Type 'X' is not assignable to type 'Y'"

**Symptoms:**
```
Type 'string | undefined' is not assignable to type 'string'
```

**Cause:**
TypeScript strict mode catching potential null/undefined values

**Solution:**

```typescript
// ❌ Error: optional field passed to non-optional parameter
const member = await this.prisma.member.findUnique({ where: { id } })
sendEmail(member.email)  // Error! email is optional

// ✅ Solution 1: Null check
const member = await this.prisma.member.findUnique({ where: { id } })
if (!member) throw new Error('Not found')
if (!member.email) throw new Error('No email')
sendEmail(member.email)  // OK now

// ✅ Solution 2: Non-null assertion (use sparingly)
const member = await this.prisma.member.findUnique({ where: { id } })
sendEmail(member!.email!)  // Asserts non-null

// ✅ Solution 3: Optional chaining
member?.email && sendEmail(member.email)
```

---

### Error: "Argument of type 'any' is not assignable"

**Cause:**
Implicit `any` in function parameters (strict mode)

**Solution:**

```typescript
// ❌ WRONG - Implicit any
async process(data) {  // Error!
  return data.value
}

// ✅ CORRECT - Explicit type
async process(data: { value: string }) {
  return data.value
}

// ✅ CORRECT - Using Prisma types
async create(data: Prisma.MemberCreateInput) {
  return await this.prisma.member.create({ data })
}
```

---

## Test Errors

### Error: "container removal already in progress"

**Symptoms:**
```
Error: container removal already in progress
  at Testcontainers (...)
```

**Cause:**
Docker timing issue with container reuse

**Solution:**

1. **Retry test (usually resolves):**
   ```bash
   pnpm test your-repository.test.ts
   ```

2. **If persistent, force remove:**
   ```bash
   # List all postgres containers
   docker ps -a | grep postgres

   # Force remove stuck container
   docker rm -f <container-id>
   ```

3. **Disable container reuse temporarily:**
   ```typescript
   // In TestDatabase class
   // Remove .withReuse() temporarily
   ```

---

### Error: Schema Changes Not Reflected

**Symptoms:**
- Made schema changes
- Tests still use old schema
- Missing columns/fields

**Cause:**
Prisma client not regenerated or not applied to test container

**Solution:**

```bash
# 1. Regenerate Prisma client
cd packages/database
pnpm prisma generate

# 2. Tests auto-apply schema via db push
# No manual action needed

# 3. If still issues, clear generated files
rm -rf node_modules/.prisma
pnpm prisma generate

# 4. Re-run tests
pnpm test
```

---

### Error: "Cannot find module '@sentinel/database'"

**Symptoms:**
- Import errors in tests
- Module not found errors
- Fresh clone/install

**Solution:**

```bash
# 1. Build all packages
pnpm install
pnpm -r build

# 2. Specifically build database package
cd packages/database
pnpm build

# 3. If still failing, clean and rebuild
pnpm clean
pnpm install
pnpm -r build
```

---

## Performance Issues

### Problem: Slow Query Performance

**Symptoms:**
- Repository methods taking >1 second
- Database timeouts in tests
- High CPU usage

**Diagnosis:**

```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

**Solutions:**

1. **Add indexes:**
   ```prisma
   // In schema.prisma
   model Member {
     // ...
     @@index([lastName, firstName])
     @@index([divisionId])
   }
   ```

2. **Use select instead of full object:**
   ```typescript
   // ❌ SLOW - Fetches all fields
   const members = await this.prisma.member.findMany()

   // ✅ FAST - Fetches only needed fields
   const members = await this.prisma.member.findMany({
     select: { id: true, firstName: true, lastName: true }
   })
   ```

3. **Use parallel queries:**
   ```typescript
   // ❌ SLOW - Sequential
   const total = await this.prisma.member.count()
   const items = await this.prisma.member.findMany()

   // ✅ FAST - Parallel
   const [total, items] = await Promise.all([
     this.prisma.member.count(),
     this.prisma.member.findMany()
   ])
   ```

4. **Avoid N+1 queries:**
   ```typescript
   // ❌ SLOW - N+1 query problem
   const members = await this.prisma.member.findMany()
   for (const member of members) {
     member.badges = await this.prisma.badge.findMany({
       where: { memberId: member.id }
     })
   }

   // ✅ FAST - Single query with include
   const members = await this.prisma.member.findMany({
     include: { badges: true }
   })
   ```

---

### Problem: Low Test Coverage

**Symptoms:**
- Coverage report shows <90%
- Uncovered lines in repository
- CI failing on coverage threshold

**Diagnosis:**

```bash
# Generate coverage report
pnpm test your-repository.test.ts --coverage

# Open HTML report
open coverage/index.html

# Check uncovered lines
```

**Common Missing Coverage:**

1. **Error paths:**
   ```typescript
   // Add tests for:
   it('should throw on duplicate unique field')
   it('should throw on FK violation')
   it('should throw on not found')
   ```

2. **Edge cases:**
   ```typescript
   // Add tests for:
   it('should handle empty results')
   it('should handle null values')
   it('should handle special characters')
   ```

3. **Filter variations:**
   ```typescript
   // Add tests for:
   it('should filter by single field')
   it('should filter by multiple fields')
   it('should handle no filters')
   ```

---

## Prisma Error Codes Reference

| Code | Meaning | Common Cause | Solution |
|------|---------|--------------|----------|
| P2002 | Unique constraint failed | Duplicate value | Check uniqueness before insert |
| P2003 | Foreign key constraint failed | Invalid FK value | Verify referenced record exists |
| P2025 | Record not found | ID doesn't exist | Check ID before update/delete |
| P2014 | Invalid relation reference | Wrong relation path | Fix relation in query |
| P1001 | Can't reach database | Connection issue | Check DATABASE_URL |

**Full reference:** https://www.prisma.io/docs/reference/api-reference/error-reference

---

## Debugging Checklist

When repository tests fail:

- [ ] Check for `prisma.` instead of `this.prisma.`
- [ ] Verify Prisma client regenerated after schema changes
- [ ] Check transaction uses `update` not `updateMany`
- [ ] Ensure database package built
- [ ] Verify test database started (beforeAll executed)
- [ ] Check for implicit `any` types
- [ ] Verify FK references exist in seed data
- [ ] Check that test database reset between tests
- [ ] Ensure no race conditions in parallel queries
- [ ] Verify unique constraints in test data

---

## Getting Help

**Before asking for help:**
1. Check this guide for your error
2. Search closed issues on GitHub
3. Run with verbose logging enabled
4. Isolate the failing test

**When reporting issues:**
- Include full error message
- Provide minimal reproduction
- Show repository method code
- Include test code
- Specify Prisma version

**Resources:**
- [Prisma Discord](https://discord.gg/prisma)
- [Sentinel GitHub Issues](https://github.com/DeadshotOMEGA/sentinel/issues)

---

## Related Documentation

**Reference:**
- [Repository Patterns](repository-patterns.md)
- [Prisma Error Reference](https://www.prisma.io/docs/reference/api-reference/error-reference)

**How-to Guides:**
- [How to Add a Repository](../howto/add-repository.md)
- [How to Migrate a Repository](../howto/migrate-repository.md)

**Explanation:**
- [Repository Pattern Explained](../explanation/repository-pattern.md)

**Code:**
- [Test Helpers](../../../apps/backend/tests/helpers/testcontainers.ts)

---

**Last Updated:** 2026-01-20
