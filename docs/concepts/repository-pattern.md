---
type: concept
title: "Repository Pattern"
status: published
created: 2026-01-19
last_updated: 2026-01-19
ai:
  priority: high
  context_load: on-demand
  triggers:
    - repository
    - repository pattern
    - data access
    - prisma
  token_budget: 350
---

# Repository Pattern

**Definition:** Abstraction layer between business logic and data access that encapsulates database operations.

**Purpose:** Isolate data access logic from business logic, making code testable and maintainable.

---

## Core Concepts

### Separation of Concerns
- **Repository**: Knows HOW to access data (SQL, Prisma, queries)
- **Service**: Knows WHAT to do with data (business rules)
- **Route**: Knows WHEN to do it (HTTP handling)

### Single Responsibility
Each repository manages **one entity** (Member, Badge, Checkin, etc.)

---

## Sentinel Repository Structure

```typescript
// apps/backend/src/repositories/member-repository.ts
import { PrismaClient, Member } from '@sentinel/database'

export class MemberRepository {
  constructor(private prisma: PrismaClient) {}  // Dependency injection

  // CRUD Operations
  async create(data: CreateMemberInput): Promise<Member> {
    return this.prisma.member.create({ data })
  }

  async findById(id: string): Promise<Member | null> {
    return this.prisma.member.findUnique({ where: { id } })
  }

  async update(id: string, data: UpdateMemberInput): Promise<Member> {
    return this.prisma.member.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.member.delete({ where: { id } })
  }

  // Query Operations
  async findByServiceNumber(serviceNumber: string): Promise<Member | null> {
    return this.prisma.member.findUnique({
      where: { serviceNumber }
    })
  }

  async findByDivision(divisionId: string): Promise<Member[]> {
    return this.prisma.member.findMany({
      where: { divisionId }
    })
  }

  async findAll(filters?: MemberFilters): Promise<Member[]> {
    return this.prisma.member.findMany({
      where: this.buildWhereClause(filters),
      orderBy: { lastName: 'asc' }
    })
  }

  // Helper methods
  private buildWhereClause(filters?: MemberFilters) {
    // Complex query logic encapsulated
  }
}
```

---

## Key Principles

### 1. Dependency Injection

**Inject Prisma client** instead of importing it:

```typescript
// ✅ Good - testable
constructor(private prisma: PrismaClient) {}

// ❌ Bad - hard to test
import { prisma } from '@sentinel/database'
```

**Benefits:**
- Easy to inject test database
- No global state
- Clear dependencies

### 2. Type Safety

Use Prisma-generated types:

```typescript
import { Member, Prisma } from '@sentinel/database'

async create(data: Prisma.MemberCreateInput): Promise<Member> {
  // TypeScript catches errors at compile time
}
```

### 3. Error Handling

**Throw descriptive errors** for constraints:

```typescript
async create(data: CreateMemberInput): Promise<Member> {
  try {
    return await this.prisma.member.create({ data })
  } catch (error) {
    if (error.code === 'P2002') {
      throw new Error(`Member with service number ${data.serviceNumber} already exists`)
    }
    throw error
  }
}
```

### 4. No Business Logic

Repositories should **NOT** contain:
- ❌ Validation beyond database constraints
- ❌ Authorization checks
- ❌ Complex calculations
- ❌ External API calls

**That belongs in Services.**

---

## Common Repository Methods

### Standard CRUD
```typescript
create(data: CreateInput): Promise<Entity>
findById(id: string): Promise<Entity | null>
findAll(filters?: Filters): Promise<Entity[]>
update(id: string, data: UpdateInput): Promise<Entity>
delete(id: string): Promise<void>
```

### Existence Checks
```typescript
exists(id: string): Promise<boolean>
existsByServiceNumber(sn: string): Promise<boolean>
```

### Counting
```typescript
count(filters?: Filters): Promise<number>
```

### Relations
```typescript
findByIdWithBadges(id: string): Promise<MemberWithBadges | null>
```

### Batch Operations
```typescript
createMany(data: CreateInput[]): Promise<Member[]>
updateMany(updates: BatchUpdate[]): Promise<number>
deleteMany(ids: string[]): Promise<number>
```

---

## Testing Repositories

**Always use integration tests** with real database:

```typescript
describe('MemberRepository', () => {
  const testDb = new TestDatabase()
  let repo: MemberRepository

  beforeAll(async () => {
    await testDb.start()
    repo = new MemberRepository(testDb.prisma!)  // Inject test database
  })

  it('should create member', async () => {
    const member = await repo.create({
      serviceNumber: 'SN123',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: 'div-1'
    })

    expect(member.id).toBeDefined()
  })

  it('should throw on duplicate service number', async () => {
    await repo.create({ serviceNumber: 'SN123', ... })

    await expect(
      repo.create({ serviceNumber: 'SN123', ... })
    ).rejects.toThrow('already exists')
  })
})
```

**Coverage target:** 90%+ for repositories

---

## Benefits

1. **Testability**: Easy to inject test database
2. **Maintainability**: Database logic in one place
3. **Reusability**: Services can share repository methods
4. **Flexibility**: Can swap Prisma for another ORM without changing services
5. **Type Safety**: Prisma types flow through the system

---

## Anti-Patterns

### ❌ Business Logic in Repository

```typescript
// Wrong
async createMember(data: CreateInput): Promise<Member> {
  // ❌ Authorization check
  if (!user.canCreateMembers) throw new Error('Unauthorized')

  // ❌ Complex validation
  if (!this.isValidRank(data.rank)) throw new Error('Invalid rank')

  return this.prisma.member.create({ data })
}
```

**Fix:** Move to service layer.

### ❌ Exposing Prisma Client

```typescript
// Wrong
async getPrisma(): PrismaClient {
  return this.prisma  // ❌ Exposes implementation
}
```

**Fix:** Encapsulate all data access in repository methods.

### ❌ Not Using Dependency Injection

```typescript
// Wrong
import { prisma } from '@sentinel/database'

export class MemberRepository {
  async create(data: CreateInput) {
    return prisma.member.create({ data })  // ❌ Hard to test
  }
}
```

**Fix:** Inject Prisma client via constructor.

---

## Related Concepts

- [Service Pattern](service-pattern.md) - Business logic layer
- [Integration Testing](integration-testing.md) - How to test repositories
- [Dependency Injection](dependency-injection.md) - Constructor injection pattern
- [Testcontainers](testcontainers.md) - Real database for tests

---

## Sentinel Standards

- **14 repositories** in backend (Member, Badge, Checkin, etc.)
- **90%+ test coverage** required
- **Integration tests** with Testcontainers
- **Dependency injection** for Prisma client
- **No business logic** in repositories
