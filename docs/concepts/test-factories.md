---
type: concept
title: "Test Factories"
status: published
created: 2026-01-19
last_updated: 2026-01-19
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - test factories
    - test data
    - factory pattern
    - test fixtures
  token_budget: 250
---

# Test Factories

**Definition:** Helper functions that create test data with sensible defaults and customization options.

**Purpose:** Reduce boilerplate in tests while ensuring valid, isolated test data.

---

## Core Principles

### 1. Sensible Defaults
Factory provides valid data out of the box:

```typescript
const member = createMemberData()
// Returns complete, valid member data without arguments
```

### 2. Customization
Override specific fields as needed:

```typescript
const cpo = createMemberData({ rank: 'CPO1' })
const divisionMember = createMemberData({ divisionId: 'ops-div' })
```

### 3. Uniqueness
Generate unique values to avoid conflicts:

```typescript
export function createMemberData(overrides = {}) {
  return {
    serviceNumber: `SN${Date.now()}${Math.random()}`,  // Unique
    rank: 'AB',
    firstName: 'Test',
    lastName: 'Member',
    divisionId: 'default-div',
    ...overrides,  // Override defaults
  }
}
```

---

## Sentinel Factory Pattern

```typescript
// apps/backend/tests/helpers/factories.ts

// Member Factory
export function createMemberData(overrides: Partial<MemberCreateInput> = {}) {
  return {
    serviceNumber: `SN${Date.now()}${Math.floor(Math.random() * 1000)}`,
    rank: 'AB',
    firstName: 'John',
    lastName: 'Doe',
    divisionId: 'default-division-id',
    joinedAt: new Date(),
    ...overrides,
  }
}

// Badge Factory
export function createBadgeData(overrides: Partial<BadgeCreateInput> = {}) {
  return {
    serialNumber: `BADGE${Date.now()}${Math.floor(Math.random() * 1000)}`,
    statusId: 'active-status-id',
    assignedAt: new Date(),
    ...overrides,
  }
}

// Checkin Factory
export function createCheckinData(overrides: Partial<CheckinCreateInput> = {}) {
  return {
    direction: 'IN',
    timestamp: new Date(),
    ...overrides,
  }
}

// Division Factory (for baseline data)
export function createDivisionData(overrides = {}) {
  return {
    code: `DIV${Date.now()}`,
    name: 'Test Division',
    ...overrides,
  }
}
```

---

## Usage in Tests

### Basic Usage

```typescript
it('should create member', async () => {
  const memberData = createMemberData()
  const member = await repo.create(memberData)

  expect(member.serviceNumber).toBe(memberData.serviceNumber)
})
```

### Customization

```typescript
it('should create member with specific rank', async () => {
  const cpoData = createMemberData({ rank: 'CPO1' })
  const cpo = await repo.create(cpoData)

  expect(cpo.rank).toBe('CPO1')
})
```

### Related Entities

```typescript
it('should create member with badge', async () => {
  const member = await memberRepo.create(createMemberData())

  const badgeData = createBadgeData({ memberId: member.id })
  const badge = await badgeRepo.create(badgeData)

  expect(badge.memberId).toBe(member.id)
})
```

### Multiple Instances

```typescript
it('should find members by division', async () => {
  const divisionId = 'ops-division'

  await memberRepo.create(createMemberData({ divisionId }))
  await memberRepo.create(createMemberData({ divisionId }))
  await memberRepo.create(createMemberData({ divisionId: 'other-div' }))

  const members = await memberRepo.findByDivision(divisionId)

  expect(members).toHaveLength(2)
})
```

---

## Advanced Patterns

### Factory with Database Persistence

```typescript
// Create and persist in one call
export async function createMember(
  repo: MemberRepository,
  overrides = {}
): Promise<Member> {
  return repo.create(createMemberData(overrides))
}

// Usage
it('should test with persisted member', async () => {
  const member = await createMember(repo, { rank: 'CPO1' })
  // member already exists in database
})
```

### Sequence Generation

```typescript
let memberSequence = 0

export function createMemberData(overrides = {}) {
  memberSequence++
  return {
    serviceNumber: `SN${memberSequence.toString().padStart(6, '0')}`,
    firstName: `Member${memberSequence}`,
    lastName: 'Test',
    ...overrides,
  }
}

// Generates: SN000001, SN000002, SN000003...
```

### Realistic Random Data

```typescript
import { faker } from '@faker-js/faker'

export function createMemberData(overrides = {}) {
  return {
    serviceNumber: `SN${faker.number.int({ min: 100000, max: 999999 })}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    ...overrides,
  }
}
```

---

## Benefits

1. **DRY**: Define test data once, use everywhere
2. **Readable**: `createMemberData({ rank: 'CPO1' })` is clearer than inline object
3. **Maintainable**: Schema changes only affect factory, not every test
4. **Valid by default**: Factories always provide valid data
5. **Flexible**: Easy to customize per test

---

## Anti-Patterns

### ❌ Shared Global Data

```typescript
// Wrong - global state causes flaky tests
const testMember = createMemberData()

it('test 1', async () => {
  await repo.create(testMember)  // ❌ Uses global
})

it('test 2', async () => {
  await repo.create(testMember)  // ❌ Duplicate key error!
})
```

**Fix:** Create fresh data in each test.

### ❌ Factories with Side Effects

```typescript
// Wrong - factory modifies database
export async function createMember(): Promise<Member> {
  return globalRepo.create(createMemberData())  // ❌ Hidden database write
}
```

**Fix:** Factories should return data, not persist it (unless explicitly named `createAndPersist`).

### ❌ Complex Factory Logic

```typescript
// Wrong - too much logic in factory
export function createMemberData(overrides = {}) {
  const data = { ... }

  // ❌ Complex conditional logic
  if (overrides.includeEmail) {
    data.email = generateEmail(data.firstName, data.lastName)
  }

  if (overrides.withBadge) {
    data.badge = createBadgeData()  // ❌ Nested factory
  }

  return data
}
```

**Fix:** Keep factories simple. Create separate factories for different needs.

---

## Related Concepts

- [Integration Testing](integration-testing.md) - Where factories are used
- [Testcontainers](testcontainers.md) - Test database setup
- [Repository Pattern](repository-pattern.md) - What factories create data for

---

## Example: Complete Test Setup

```typescript
// tests/helpers/factories.ts
export function createMemberData(overrides = {}) {
  return {
    serviceNumber: `SN${Date.now()}${Math.random()}`,
    rank: 'AB',
    firstName: 'Test',
    lastName: 'Member',
    divisionId: 'default-div',
    ...overrides,
  }
}

// tests/integration/repositories/member-repository.test.ts
import { createMemberData } from '../../helpers/factories'

describe('MemberRepository', () => {
  const testDb = new TestDatabase()
  let repo: MemberRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new MemberRepository(testDb.prisma!)
  })

  beforeEach(async () => {
    await testDb.reset()  // Fresh database
  })

  it('should create member', async () => {
    const data = createMemberData()  // Fresh data each time
    const member = await repo.create(data)

    expect(member.serviceNumber).toBe(data.serviceNumber)
  })

  it('should create CPO member', async () => {
    const data = createMemberData({ rank: 'CPO1' })  // Customize
    const member = await repo.create(data)

    expect(member.rank).toBe('CPO1')
  })
})
```

---

## Best Practices

1. **One factory per entity**: `createMemberData`, `createBadgeData`, etc.
2. **Return plain data**: Let tests call `repo.create()` explicitly
3. **Unique identifiers**: Use timestamps/random for uniqueness
4. **Sensible defaults**: Factory should work without arguments
5. **Easy customization**: Accept `overrides` parameter
6. **No side effects**: Pure functions that return data
