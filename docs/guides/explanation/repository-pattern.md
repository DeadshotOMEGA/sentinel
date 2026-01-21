---
type: explanation
title: "Repository Pattern in Sentinel"
status: published
created: 2026-01-20
last_updated: 2026-01-20
ai:
  priority: high
  context_load: on-demand
  triggers:
    - repository
    - data access
    - prisma
    - database abstraction
  token_budget: 1500
concepts:
  - Repository Pattern
  - Data Access Layer
  - Dependency Injection
related_topics:
  - Testing Philosophy
  - Prisma ORM
---

# Repository Pattern in Sentinel

**What this explains:** How Sentinel uses the Repository Pattern to abstract database operations and enable testable data access

**Why it matters:** Understanding this pattern is essential for working with database operations, writing tests, and maintaining data layer code

**Related concepts:** [Testing Philosophy](../../cross-cutting/testing/CLAUDE.md), [Prisma Documentation](../../../packages/database/CLAUDE.md)

---

## The Big Picture

The Repository Pattern provides a clean abstraction layer between business logic and data persistence. In Sentinel, repositories encapsulate all database operations using Prisma ORM, making the data access layer:
- **Testable** - Can inject test database clients
- **Maintainable** - Single location for all data operations
- **Type-safe** - Full TypeScript support
- **Consistent** - Standard patterns across all entities

**Key insight:** Repositories are the ONLY layer that directly interacts with Prisma. Services, routes, and middleware always go through repositories.

---

## The Problem

**What problem does this solve?**

Without the Repository Pattern, database operations would be scattered throughout the codebase:
- Routes would call Prisma directly
- Services would have mixed business logic and SQL
- Tests would be impossible without mocking the entire Prisma client
- Changing database providers would require changes across hundreds of files

**Example scenario:**
```typescript
// ❌ Without Repository Pattern - database logic in route
app.get('/members/:id', async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id },
    include: { division: true, badges: true }
  })

  if (!member) {
    return res.status(404).json({ error: 'Not found' })
  }

  res.json(member)
})

// Testing this requires mocking prisma globally!
```

**Why existing approaches fall short:**
- **Direct Prisma calls** - Not testable, scattered logic
- **Service layer with Prisma** - Still couples business logic to ORM
- **Active Record pattern** - Doesn't work well with Prisma's generated client

---

## Core Concepts

### Concept 1: Repository as Data Access Layer

A repository is a class that encapsulates ALL database operations for a single entity:

**Mental model:** Think of a repository as a specialized librarian who knows where every book (record) is stored and how to find them quickly.

**Example:**
```typescript
export class MemberRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findById(id: string) {
    return await this.prisma.member.findUnique({ where: { id } })
  }

  async create(data: CreateMemberInput) {
    return await this.prisma.member.create({ data })
  }

  // All member-related database operations
}
```

**Visualization:**
```
Route/Service Layer
       ↓
   Repository ← Only layer touching Prisma
       ↓
  Prisma Client
       ↓
   PostgreSQL
```

---

### Concept 2: Dependency Injection for Testability

Repositories accept an optional PrismaClient in the constructor, enabling test database injection:

**Mental model:** Like providing a repository with different databases depending on context - production database for real app, test container for tests.

**Example:**
```typescript
// Production: Uses default global client
const memberRepo = new MemberRepository()

// Testing: Inject test database client
const testPrisma = new PrismaClient({ adapter: testAdapter })
const memberRepo = new MemberRepository(testPrisma)
```

**Why this works:** All repository methods use `this.prisma`, which can be either the production or test client.

---

### Concept 3: Type-Safe Database Operations

Repositories leverage Prisma's generated types for compile-time safety:

**Mental model:** Like having a blueprint that ensures you're building with the right materials in the right way.

**Example:**
```typescript
import type { Prisma } from '@prisma/client'

async create(data: Prisma.MemberCreateInput) {
  return await this.prisma.member.create({ data })
}

// TypeScript ensures 'data' matches schema exactly
// Missing required fields → compile error
// Wrong field types → compile error
```

---

## How It Works

### High-Level Flow

```
1. Route receives request
   ↓
2. Route calls repository method
   ↓
3. Repository executes Prisma query
   ↓
4. Prisma generates SQL
   ↓
5. PostgreSQL returns data
   ↓
6. Repository returns typed result
   ↓
7. Route formats response
```

**Step 1:** Request arrives at Express route
**Step 2:** Route delegates to repository (no direct database access)
**Step 3:** Repository uses injected PrismaClient (test or production)

---

### Under the Hood

**Key mechanisms:**
1. **Constructor injection** - `prismaClient || defaultPrisma` pattern
2. **Instance property** - `this.prisma` always refers to injected client
3. **Type inference** - Prisma types flow through repository methods

**Example implementation:**
```typescript
export class MemberRepository {
  private prisma: PrismaClient // Instance property

  constructor(prismaClient?: PrismaClient) {
    // Inject test client OR use production singleton
    this.prisma = prismaClient || defaultPrisma
  }

  async findById(id: string): Promise<Member | null> {
    // Uses this.prisma (never global prisma)
    return await this.prisma.member.findUnique({ where: { id } })
  }
}
```

---

## Design Decisions

### Decision 1: Why Repository Pattern over Active Record

**Choice:** Repository Pattern

**Rationale:**
- Prisma generates a client, not models, making Active Record impractical
- Repositories centralize all queries for an entity
- Better testability through dependency injection
- Clearer separation of concerns

**Trade-offs:**
- **Benefits:**
  - Easier to test (inject test database)
  - Clear data access layer
  - Type-safe operations
- **Drawbacks:**
  - More boilerplate (one repository per entity)
  - Extra abstraction layer

**Alternatives considered:**
- **Active Record** - Doesn't fit Prisma's architecture
- **Data Mapper** - Too complex for our needs
- **Direct Prisma in services** - Not testable

---

### Decision 2: Why Dependency Injection over Global Client

**Choice:** Constructor injection with optional parameter

**Rationale:**
- Tests need isolated databases (Testcontainers)
- Production needs singleton for connection pooling
- Optional parameter provides both without extra complexity

**Trade-offs:**
- **Benefits:**
  - Same repository code works in production and tests
  - No mocking required
  - Real database integration tests
- **Drawbacks:**
  - Must remember `this.prisma` not `prisma` in all methods
  - Slightly more verbose constructor

**Alternatives considered:**
- **Global singleton only** - Can't test with real database
- **Factory pattern** - Overly complex for our use case
- **Separate test/production implementations** - Code duplication

---

## Mental Models

### Model 1: Repository as Abstraction Layer

Think of repositories like the service desk at a library:
- You don't go into the stacks (database) yourself
- You ask the desk (repository) for what you need
- The desk knows the organization system (SQL/Prisma)
- You get back exactly what you requested

**When this model helps:** Understanding why routes/services shouldn't call Prisma directly

**When this model breaks down:** When you need complex cross-entity queries (may need multiple repositories)

---

### Model 2: Dependency Injection as Switchboard

Think of dependency injection like a phone switchboard:
- Production calls route to production database
- Test calls route to test database
- Same repository code handles both
- The "switchboard" (constructor) connects to the right destination

**When this model helps:** Understanding how the same repository works in different contexts

**When this model breaks down:** Doesn't explain more complex injection scenarios (middleware, transactions)

---

## Common Misconceptions

### Misconception 1: "Repositories add unnecessary complexity"

**Wrong belief:** "We should just use Prisma directly everywhere"

**Reality:** Direct Prisma usage makes testing impossible and scatters data logic

**Why the confusion:** Repositories do add an extra layer, but the testability and organization benefits far outweigh this

**Example clarifying:**
```typescript
// Without repository - how do you test this?
app.get('/members', async (req, res) => {
  const members = await prisma.member.findMany() // Global prisma
  res.json(members)
})

// With repository - easy to test
app.get('/members', async (req, res) => {
  const members = await memberRepo.findAll() // Injected in tests
  res.json(members)
})
```

---

### Misconception 2: "Using `prisma` instead of `this.prisma` is fine"

**Wrong belief:** "It's just a shortcut, both work the same"

**Reality:** Using global `prisma` breaks tests completely

**Why the confusion:** In production both work, but tests inject a different client via `this.prisma`

**Example clarifying:**
```typescript
// ❌ Uses global prisma - tests will fail
async findById(id: string) {
  return await prisma.member.findUnique({ where: { id } })
}

// ✅ Uses injected prisma - tests work
async findById(id: string) {
  return await this.prisma.member.findUnique({ where: { id } })
}
```

---

## Relationships & Dependencies

### How Repository Pattern Relates to Testing Strategy

Repositories enable **integration-first testing** by allowing real database injection:

**Diagram:**
```
Production:
  Route → Repository(globalPrisma) → PostgreSQL

Testing:
  Route → Repository(testPrisma) → Testcontainers PostgreSQL
```

**See:** [Testing Philosophy](../../cross-cutting/testing/CLAUDE.md)

---

### Dependencies

**Repository Pattern depends on:**
- **Prisma ORM** - For type-safe database client
- **Dependency Injection** - For test/production switching
- **TypeScript** - For type inference and safety

**What depends on Repository Pattern:**
- **Integration Tests** - Rely on injectable database clients
- **Routes** - Use repositories for all data access
- **Services** - Call repositories for business logic

---

## Implications & Consequences

### Technical Implications

**Performance:**
- No performance overhead (repositories just call Prisma)
- Connection pooling handled by Prisma singleton
- Parallel queries supported via `Promise.all`

**Scalability:**
- One repository per entity scales linearly
- Easy to add caching layer in repository
- Database changes isolated to repository layer

**Complexity:**
- Adds abstraction layer (manageable complexity)
- Standard patterns reduce cognitive load
- Type safety catches errors at compile time

---

### Practical Implications

**For developers:**
- Must use `this.prisma` not `prisma` in all repository methods
- Must write integration tests for every repository
- Must follow standard repository template

**For testing:**
- Integration tests use real databases (Testcontainers)
- No mocking required for database operations
- Tests catch real SQL errors and constraint violations

**For operations:**
- Repositories centralize database performance monitoring
- Easy to add query logging/metrics
- Database migrations don't affect route/service code

---

## Best Practices

**Guidelines for using repositories effectively:**

1. **One repository per entity** - Don't create "god repositories"
2. **Always use `this.prisma`** - Never reference global `prisma` in methods
3. **Test all methods** - 90%+ coverage required for repositories
4. **Use Prisma types** - `Prisma.MemberCreateInput` not custom types
5. **Keep business logic out** - Repositories only do data operations

**Anti-patterns to avoid:**
- ❌ **Using global `prisma` in methods** - Breaks tests completely
- ❌ **Business logic in repositories** - Violates single responsibility
- ❌ **Repositories calling other repositories** - Use services for orchestration
- ❌ **Returning Prisma query builders** - Return data, not queries

---

## Further Learning

**To deepen your understanding:**

1. **Read:** [Common Repository Patterns](../reference/repository-patterns.md)
2. **Try:** [How to Add a Repository](../howto/add-repository.md)
3. **Reference:** [Repository Testing Guide](../../../apps/backend/tests/CLAUDE.md)

**External resources:**
- [Martin Fowler - Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

## Summary

**Key takeaways:**
1. Repositories abstract database operations for testability and maintainability
2. Dependency injection enables using test databases without mocking
3. Always use `this.prisma` in repository methods for tests to work
4. Repositories are the ONLY layer that touches Prisma directly

**In one sentence:** The Repository Pattern provides a testable, type-safe abstraction over Prisma ORM through dependency injection.

---

## Related Documentation

**Explanation:**
- [Testing Philosophy](../../cross-cutting/testing/CLAUDE.md)

**How-to Guides:**
- [How to Add a Repository](../howto/add-repository.md)
- [How to Migrate a Repository](../howto/migrate-repository.md)

**Reference:**
- [Repository Patterns Reference](../reference/repository-patterns.md)
- [Troubleshooting Repositories](../reference/troubleshooting-repositories.md)

**Code:**
- [apps/backend/src/repositories/](../../../apps/backend/src/repositories/)

---

**Last Updated:** 2026-01-20
