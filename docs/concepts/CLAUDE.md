# Atomic Concepts (AI-First Guide)

**Purpose:** Single-concept definitions for efficient AI context loading

**AI Context Priority:** high

**When to Load:** User asks about specific concept, needs quick definition

**Triggers:** what is, define, concept, pattern

---

## Quick Reference

### What Goes Here

Single-concept documents (200-500 tokens each):
- Design patterns
- Technical concepts
- Domain concepts
- Best practices

**One concept = One file**

### File Naming

**Pattern:** `simple-noun-phrase.md`

**Examples:**
- `integration-testing.md`
- `testcontainers.md`
- `repository-pattern.md`
- `dependency-injection.md`

**Rules:**
- 1-3 words max
- No type prefix
- Descriptive, not clever
- Singular or full term

---

## Atomic Documentation Philosophy

### Why Atomic?

**Token efficiency:**
- AI loads exactly what's needed
- No loading irrelevant content
- Context budget preserved

**Reusability:**
- Same concept referenced from multiple docs
- DRY principle for documentation
- Single source of truth

**Maintainability:**
- Smaller surface area to update
- Easier to keep accurate
- Clear ownership

---

## Atomic Document Structure

### Template

```markdown
# Concept Name

**Definition:** One-sentence definition

## What It Is

Brief explanation (2-3 sentences)

## When to Use

- Scenario 1
- Scenario 2

## Example

[Code or practical example]

## Related

- [Related Concept 1](related-concept.md)
- [How-to Guide](../guides/howto/use-concept.md)
```

**Keep it brief:** 200-500 tokens ideal

---

## Writing Atomic Concepts

### Do

✅ **One concept only**
```markdown
# Repository Pattern

**Definition:** Data access abstraction separating business logic from database operations.

## What It Is

Repositories provide a clean interface to database operations. They
encapsulate Prisma queries and present domain-focused methods.

## When to Use

- Accessing database from services
- Need to test business logic without database
- Want consistent data access patterns

## Example

```typescript
class MemberRepository {
  async findById(id: string): Promise<Member | null> {
    return this.prisma.member.findUnique({ where: { id } })
  }
}
```

## Related

- [Service Pattern](service-pattern.md)
- [How to Add Repository](../guides/howto/add-repository.md)
```

✅ **Dense linking**
```markdown
## Related

- [Integration Testing](integration-testing.md)
- [Testcontainers](testcontainers.md)
- [Test Fixtures](test-fixtures.md)
- [How to Write Tests](../guides/howto/write-tests.md)
```

✅ **Practical examples**
```markdown
## Example

```typescript
// Real code from codebase
const testDb = new TestDatabase()
await testDb.start()
```

**See:** [apps/backend/tests/helpers/testcontainers.ts](../../apps/backend/tests/helpers/testcontainers.ts)
```

### Don't

❌ **Mix multiple concepts**
```markdown
# Testing Patterns

## Repository Testing
[Explanation]

## Service Testing
[Explanation]

## Route Testing
[Explanation]

[Too broad - split into 3 atomic docs]
```

❌ **Write detailed guides**
```markdown
# Repository Pattern

[5000 words explaining every detail...]

[Too detailed - becomes a guide, not a concept]
```

❌ **Skip examples**
```markdown
# Dependency Injection

It's a pattern where dependencies are provided externally.

[No example - hard to understand]
```

---

## Atomic vs. Explanation

### Atomic Concept

**Purpose:** Quick definition + example
**Length:** 200-500 tokens
**Depth:** Surface level
**Example:** "What is a repository?"

**File:** `concepts/repository-pattern.md`

### Explanation

**Purpose:** Deep understanding + rationale
**Length:** 1000-3000 tokens
**Depth:** Comprehensive
**Example:** "Why we use repositories and how they fit in our architecture"

**File:** `guides/explanation/repository-architecture.md`

**Relationship:** Concept is quick reference, Explanation is deep dive

---

## Concept Examples

### Good Atomic Concepts

**Technical patterns:**
- `repository-pattern.md` - What repositories are
- `service-pattern.md` - What services are
- `dependency-injection.md` - What DI is

**Testing concepts:**
- `integration-testing.md` - What integration tests are
- `testcontainers.md` - What Testcontainers is
- `test-fixtures.md` - What test fixtures are

**Domain concepts:**
- `checkin-direction.md` - IN/OUT direction logic
- `badge-lifecycle.md` - Badge states
- `member-status.md` - Member statuses

### Bad Examples

❌ `testing-everything.md` - Too broad
❌ `what-is-integration-testing.md` - Verbose naming
❌ `int-test.md` - Abbreviated
❌ `integration-test.md` - Use full term "integration-testing"

---

## Index Not Needed

**No index.md required** for concepts directory.

**Why:**
- Self-organizing by filename
- Link directly from other docs
- Search/grep works well

---

## Related Documentation

**Explanations:**
- [Explanation Guides](../guides/explanation/CLAUDE.md) - Deep dives

**How-tos:**
- [How-to Guides](../guides/howto/CLAUDE.md) - Using concepts

**System:**
- [Root CLAUDE.md](../CLAUDE.md) - Overall navigation

---

**Last Updated:** 2026-01-19
