# Research Documents Index

**Purpose:** Investigation findings and technical analysis

**Last Updated:** 2026-01-19

---

## What Is Research Documentation?

Research docs record:
- Technology evaluations
- Spike investigations
- Performance analysis
- Comparison studies
- Feasibility assessments
- Technical explorations

**Purpose:** Inform decisions with evidence

---

## Active Research

Currently ongoing investigations:

| Topic | Started | Status | Related ADR |
|-------|---------|--------|-------------|
| *No active research* | - | - | - |

**Total Active:** 0

---

## Completed Research

Finished investigations:

| Topic | Completed | Key Finding | Outcome |
|-------|-----------|-------------|---------|
| [Backend Architecture](2026-01-18-backend-executive-summary.md) | 2026-01-18 | Full rebuild recommended | Backend rebuild plan created |
| [Framework Comparison](2026-01-18-framework-comparison.md) | 2026-01-18 | Express + ts-rest optimal | Express chosen |
| [ORM Comparison](2026-01-18-orm-database-comparison.md) | 2026-01-18 | Prisma 7 best fit | Prisma adopted |
| [Authentication Solutions](2026-01-18-authentication-solutions.md) | 2026-01-18 | better-auth recommended | better-auth chosen |
| [Testing Strategy](2026-01-18-testing-strategy.md) | 2026-01-18 | Integration-first approach | Testcontainers adopted |

**Total Completed:** 10

---

## Research by Category

### Technology Evaluation
- [2026-01-18: Framework Comparison](2026-01-18-framework-comparison.md) - Express, Fastify, Hono, Elysia evaluation
- [2026-01-18: ORM/Database Comparison](2026-01-18-orm-database-comparison.md) - Prisma, Drizzle, Kysely analysis
- [2026-01-18: Authentication Solutions](2026-01-18-authentication-solutions.md) - better-auth, Lucia, NextAuth comparison
- [2026-01-18: Real-time Communication](2026-01-18-realtime-communication.md) - WebSocket, SSE, Socket.io evaluation
- [2026-01-18: Validation & Type Safety](2026-01-18-validation-type-safety.md) - Zod, Valibot, ts-rest analysis

### Performance Analysis
*No research yet*

### Security Assessment
- [2026-01-18: Authentication Solutions](2026-01-18-authentication-solutions.md) - Auth security patterns

### Architecture Investigation
- [2026-01-18: Backend Architecture Analysis](2026-01-18-backend-architecture-analysis.md) - Current state analysis
- [2026-01-18: Current Backend Analysis](2026-01-18-current-backend-analysis.md) - Detailed assessment
- [2026-01-18: Backend Executive Summary](2026-01-18-backend-executive-summary.md) - High-level findings

### Library Comparison
- [2026-01-18: Framework Comparison](2026-01-18-framework-comparison.md) - Express vs alternatives
- [2026-01-18: ORM Comparison](2026-01-18-orm-database-comparison.md) - Prisma vs alternatives

---

## Research by Domain

### Authentication
- [2026-01-18: Authentication Solutions](2026-01-18-authentication-solutions.md) - better-auth evaluation

### Personnel Management
*No research yet*

### Check-in System
*No research yet*

### Testing Infrastructure
- [2026-01-18: Testing Strategy](2026-01-18-testing-strategy.md) - Integration-first approach with Testcontainers

---

## Creating Research Documents

**When to create:**
- Need to evaluate technology choices
- Investigating performance issues
- Comparing multiple approaches
- Assessing feasibility
- Before making major decisions

**How to create:**
1. Copy template: `cp docs/templates/research.md docs/research/YYYY-MM-DD-research-topic.md`
2. Define research question
3. Document methodology
4. Record findings with evidence
5. Provide recommendations
6. Link to resulting ADR if decision made
7. Add to this index

**See:** [Research CLAUDE.md](CLAUDE.md) for format guide

---

## Research to ADR Flow

```
Research Question
       ↓
Investigation (research.md)
       ↓
Findings & Recommendations
       ↓
Decision (ADR)
       ↓
Implementation (Plan)
```

**Example:**
1. Research: "Evaluate better-auth vs. custom JWT"
2. Finding: "better-auth has API key support"
3. Decision: ADR-0002-better-auth-adoption.md
4. Implementation: Backend rebuild plan Phase 2.1

---

## Search Research

**By topic:**
```bash
rg "topic" docs/research/
```

**By technology:**
```bash
rg "better-auth|testcontainers|heroui" docs/research/
```

**By date:**
```bash
ls docs/research/2026-01-*.md
```

---

## Research Statistics

- **Total Research Docs:** 10
- **Active Investigations:** 0
- **Completed:** 10
- **Research → ADR Rate:** 100% (all informed backend rebuild plan)

---

## Related Documentation

- [Research Format Guide](CLAUDE.md) - How to write research docs
- [Research Template](../templates/research.md) - Starting template
- [ADR Index](../decisions/adr/index.md) - Decisions based on research
- [Plans Index](../plans/index.md) - Implementation plans
