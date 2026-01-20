# Explanation Documentation (AI-First Guide)

**Purpose:** Understanding-oriented conceptual documentation

**AI Context Priority:** medium

**When to Load:** User asks "why", wants to understand concepts, design decisions

**Triggers:** explanation, why, concept, understand, rationale, architecture

---

## Quick Reference

### What Goes Here

Conceptual understanding and rationale:
- Architecture decisions
- Design patterns
- Philosophy and principles
- Concept explanations
- Trade-off analysis

### Characteristics

- **Understanding-oriented** - Illuminates concepts
- **Conceptual** - Why, not how
- **Analytical** - Explores trade-offs
- **Thoughtful** - Considers alternatives
- **Narrative** - Story-like flow

---

## When to Create Explanations

**Create explanation when:**
- Architecture decision needs context
- Pattern requires understanding
- Users ask "why do we X?"
- Complex concept needs clarification
- Trade-offs should be documented

**Don't create explanation for:**
- Teaching how to use (use tutorial)
- Solving specific tasks (use how-to)
- Listing specifications (use reference)

---

## Explanation Structure

### Recommended Sections

**1. Context**
- Situation that led to this approach
- Problem being solved

**2. The Concept/Pattern**
- What it is
- How it works (high-level)

**3. Rationale**
- Why this approach
- Benefits

**4. Trade-offs**
- Pros and cons
- What we gave up
- What we gained

**5. Alternatives Considered**
- Other approaches
- Why not chosen

**6. Related Decisions**
- Link to ADRs
- Related concepts

---

## Writing Good Explanations

### Do

✅ **Provide context first**
```markdown
# Why Integration-First Testing

## Context

Sentinel is an attendance tracking system with complex database relationships.
Traditional unit testing with mocks was failing to catch integration bugs
between repositories and the actual database.

We needed a testing strategy that:
- Caught real database issues (constraints, relations)
- Remained fast enough for development
- Gave confidence in deployments
```

✅ **Explore trade-offs**
```markdown
## Trade-offs

**Benefits:**
- Catches real database issues before production
- Tests actual behavior, not mock behavior
- Refactoring doesn't break tests

**Drawbacks:**
- Slower than unit tests (30s vs 1s)
- Requires Docker for Testcontainers
- More complex test setup

We decided the confidence gain was worth the speed trade-off.
```

✅ **Discuss alternatives**
```markdown
## Alternatives Considered

### Option 1: Unit Tests with Mocks
**Why not:** Mocks don't catch integration issues

### Option 2: E2E Tests Only
**Why not:** Too slow for rapid development

### Option 3: Mix of Unit + Integration
**Why chosen:** Balance of speed and confidence
```

### Don't

❌ **Turn into how-to**
```markdown
# Testing Philosophy

To write tests, first create a TestDatabase instance...
[Step-by-step instructions instead of concepts]
```

❌ **Skip the "why"**
```markdown
# Integration Testing

We use integration tests.

[No explanation of why, no context, no trade-offs]
```

❌ **Be prescriptive without rationale**
```markdown
# Testing

Always use integration tests. Never use unit tests.

[No explanation, just rules]
```

---

## File Naming

**Pattern:** `[concept]-[topic].md` or `[topic].md`

**Examples:**
- `testing-philosophy.md` - Why our testing approach
- `architecture.md` - System architecture overview
- `auth-architecture.md` - Authentication design
- `realtime-design.md` - WebSocket architecture

**Type prefix optional** - directory indicates explanation

**Can use prefix:** `explanation-testing-philosophy.md` in domain directories

---

## Explanation vs. ADR

### Explanation

**Purpose:** Understand concepts
**Scope:** Broad, conceptual
**Format:** Narrative, analytical
**Updates:** Can be updated as understanding evolves

**Example:** "Why We Use Better-Auth" - Explores auth concepts

### ADR

**Purpose:** Record decisions
**Scope:** Specific decision
**Format:** Structured (Context, Decision, Consequences)
**Updates:** Immutable (create new ADR if decision changes)

**Example:** "ADR-0002: Adopt Better-Auth" - Records specific decision

**Relationship:** Explanation provides background, ADR records decision

---

## Related Documentation

**Decisions:**
- [ADRs](../../decisions/adr/CLAUDE.md) - Formal decision records

**Tutorials:**
- [Tutorials CLAUDE.md](../tutorials/CLAUDE.md) - Learning the concepts

**Templates:**
- [Explanation Template](../../templates/explanation.md)

---

**Last Updated:** 2026-01-19
