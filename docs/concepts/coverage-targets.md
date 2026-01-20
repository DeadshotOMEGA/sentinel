---
type: concept
title: "Test Coverage Targets"
status: published
created: 2026-01-19
last_updated: 2026-01-19
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - coverage
    - coverage targets
    - test coverage
    - code coverage
  token_budget: 200
---

# Test Coverage Targets

**Definition:** Minimum percentage of code executed by tests, measured by lines, functions, and branches.

**Purpose:** Ensure adequate testing without over-testing.

---

## Sentinel Coverage Standards

| Layer | Target | Priority | Rationale |
|-------|--------|----------|-----------|
| **Repositories** | 90%+ | 🔴 High | Critical data access, catches DB issues |
| **Services** | 85%+ | 🔴 High | Business logic must be verified |
| **Routes** | 80%+ | 🟡 Medium | API contracts must work |
| **Overall** | 80%+ | 🟡 Medium | Project-wide quality bar |
| **Utils** | 70%+ | 🟢 Low | Pure functions, less critical |

---

## Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 70,        // 70% line coverage minimum
        functions: 70,    // 70% function coverage minimum
        branches: 65,     // 65% branch coverage minimum
      },
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        'dist/',
      ],
    },
  },
})
```

---

## Coverage Metrics Explained

### Lines Coverage
**What:** % of code lines executed during tests

**Example:**
```typescript
function divide(a: number, b: number) {
  if (b === 0) {           // Line 1: Executed ✅
    throw new Error('...')  // Line 2: NOT executed ❌
  }
  return a / b             // Line 3: Executed ✅
}

// Test only: divide(10, 2)
// Coverage: 66% (2/3 lines)
```

### Functions Coverage
**What:** % of functions called during tests

**Example:**
```typescript
function add(a, b) { return a + b }     // Called ✅
function subtract(a, b) { return a - b } // NOT called ❌

// Coverage: 50% (1/2 functions)
```

### Branches Coverage
**What:** % of decision paths tested (if/else, switch, ternary)

**Example:**
```typescript
function categorize(age: number) {
  if (age < 18) {      // Tested ✅
    return 'minor'
  } else {             // NOT tested ❌
    return 'adult'
  }
}

// Test only: categorize(15)
// Branch coverage: 50% (1/2 branches)
```

---

## Why These Targets?

### Repositories: 90%+
- **Critical path**: All data access must work
- **Database constraints**: Catch FK violations, unique constraints
- **Migration issues**: Verify Prisma schema matches expectations
- **Integration tests**: Cover CRUD + edge cases

### Services: 85%+
- **Business logic**: Core functionality must be tested
- **Complex interactions**: Services combine multiple repositories
- **Error handling**: Must handle failures gracefully

### Routes: 80%+
- **API contracts**: Ensure endpoints work as specified
- **Status codes**: Test 200, 400, 401, 404, 500 cases
- **Request/response**: Validate input/output shapes

### Overall: 80%+
- **Quality baseline**: Prevents untested code merging
- **Confidence**: High coverage = high confidence in deployments

---

## Running Coverage Reports

```bash
# Run tests with coverage
pnpm test:coverage

# View HTML report
open coverage/index.html

# Check if thresholds are met (CI/CD)
pnpm test:coverage --run
```

---

## Interpreting Reports

### Good Coverage ✅
```
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
member-repository.ts    |   92.5  |   88.2   |   95.0  |   93.1  |
```

### Poor Coverage ❌
```
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
checkin-service.ts      |   45.2  |   30.0   |   50.0  |   44.8  |
                                    ^^^^^^ Missing error paths
```

---

## Coverage Anti-Patterns

### ❌ Testing Implementation Details

```typescript
// Wrong
it('should call prisma.member.create', () => {
  const spy = vi.spyOn(prisma.member, 'create')
  await repo.create(data)
  expect(spy).toHaveBeenCalled()  // ❌ Tests implementation
})
```

**Problem:** High coverage, but brittle tests that break on refactoring.

**Fix:** Test behavior, not implementation.

### ❌ Chasing 100% Coverage

**When NOT to test:**
- Generated code (Prisma client)
- Configuration files
- Type definitions
- Trivial getters/setters

**Why:** Diminishing returns - effort better spent on critical paths.

### ❌ Ignoring Branch Coverage

```typescript
function process(data?: Data) {
  if (data) {           // ✅ Tested
    return transform(data)
  }
  return null          // ❌ NOT tested
}

// 100% line coverage, but missing else branch!
```

**Fix:** Test both branches explicitly.

---

## Coverage vs. Quality

**High coverage ≠ Good tests**

```typescript
// 100% coverage but useless test
it('should not throw', () => {
  expect(() => repo.create(data)).not.toThrow()
})
```

**Good coverage + Good tests = High quality**

```typescript
// Tests behavior and edge cases
describe('create', () => {
  it('should create member with valid data', async () => {
    const member = await repo.create(validData)
    expect(member).toMatchObject(validData)
  })

  it('should throw on duplicate service number', async () => {
    await repo.create({ serviceNumber: 'SN123' })
    await expect(
      repo.create({ serviceNumber: 'SN123' })
    ).rejects.toThrow('already exists')
  })
})
```

---

## Related Concepts

- [Integration Testing](integration-testing.md) - Primary testing approach
- [Repository Pattern](repository-pattern.md) - What we're testing
- [Test Factories](test-factories.md) - Creating test data efficiently

---

## CI/CD Enforcement

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: pnpm test:coverage --run

- name: Check coverage thresholds
  run: |
    if ! pnpm test:coverage --run; then
      echo "❌ Coverage thresholds not met"
      exit 1
    fi
```

**Result:** PRs fail if coverage drops below thresholds.
