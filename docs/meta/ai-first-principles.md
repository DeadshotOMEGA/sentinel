---
type: meta
title: "AI-First Documentation Principles"
status: published
created: 2026-01-19
last_updated: 2026-01-19
ai:
  priority: high
  context_load: on-demand
  triggers:
    - ai-first
    - optimization
    - token
    - context
    - progressive-disclosure
  token_budget: 1800
---

# AI-First Documentation Principles

**Purpose:** Strategies for optimizing documentation for AI systems like Claude Code

**Audience:** Documentation writers creating AI-consumable content

**Key Insight:** AI-first doesn't mean human-hostile. Progressive disclosure serves both.

---

## Layer 1: Core Principles (Essential Concepts)

### The AI-First Philosophy

**Traditional docs:** Optimized for human reading, AI struggles to extract efficiently

**AI-first docs:** Structured for efficient machine parsing, humans benefit from clarity

**Key difference:** Information architecture and progressive disclosure

---

### The Three Fundamental Principles

#### 1. Progressive Disclosure

**Layer information in three tiers:**

- **Layer 1 (Quick Reference):** 100-200 tokens
  - Essential information only
  - Immediate actionability
  - No explanations

- **Layer 2 (Detailed):** 500-1000 tokens
  - Expanded explanations
  - Common use cases
  - Key examples

- **Layer 3 (Complete):** 2000+ tokens
  - Comprehensive reference
  - Edge cases
  - Deep technical details

**Why:** AI can load quick reference first, only expand when needed

---

#### 2. Atomic Documentation

**One concept per document:**
- Single, focused topic
- Clear, descriptive title
- Densely linked to related concepts

**Why:** AI can load exactly what's needed, not entire chapters

**Example:**
```
❌ Bad: authentication-guide.md (covers login, sessions, API keys, security)
✅ Good:
    - authentication-architecture.md (design)
    - api-key-management.md (API keys)
    - session-management.md (sessions)
    - authentication-security.md (security)
```

---

#### 3. Machine-Readable Metadata

**Frontmatter for AI routing:**

```yaml
ai:
  priority: high                    # Load importance
  context_load: always               # When to load
  triggers: [auth, login, session]   # Keywords that match
  token_budget: 1200                 # Size estimate
```

**Why:** AI knows when and how to load each document

---

### Token Optimization

**Every token counts. Optimize for:**

1. **Density:** Maximum information per token
2. **Structure:** Clear hierarchy for parsing
3. **Redundancy:** Eliminate repetition
4. **Precision:** Exact terms, no fluff

---

### Context Priority System

**Three levels:**

- **High:** Core functionality, frequently accessed
  - Active plans
  - Primary ADRs
  - Domain entry points (CLAUDE.md)

- **Medium:** Important but occasional
  - How-to guides
  - Explanations
  - Templates

- **Low:** Reference, rarely accessed directly
  - Historical ADRs
  - Completed plans
  - Archived sessions

---

## Layer 2: Implementation Strategies

### Progressive Disclosure Patterns

#### Pattern 1: Three-Layer CLAUDE.md

**Structure every CLAUDE.md file:**

```markdown
# Directory Name (AI-First Guide)

[Frontmatter with triggers]

---

## Quick Reference     [Layer 1: 100-200 tokens]

### What's Here
- [Core info]
- [Essential links]

### When to Create Docs Here
- [Condition 1]
- [Condition 2]

---

## Detailed Guide      [Layer 2: 500-1000 tokens]

### File Naming
[Conventions]

### Document Examples
[Types of docs]

### Related Documentation
[Links]

---

## Complete Reference  [Layer 3: 2000+ tokens if needed]

[Deep technical details]
[Edge cases]
[Anti-patterns]
```

**Token distribution:**
- Layer 1: ~150 tokens (quick scan)
- Layer 2: ~700 tokens (working knowledge)
- Layer 3: ~1500+ tokens (comprehensive)

**Total:** ~2400 tokens for complete CLAUDE.md

---

#### Pattern 2: Quick Solution First

**How-to guides:**

```markdown
# How to [Task]

**Goal:** [One sentence]

---

## Quick Solution

**For experienced users:**
```[language]
# Complete solution
```

**For detailed walkthrough, continue reading.**

---

## Step-by-Step Instructions

[Full details]
```

**Why:** AI can grab quick solution immediately, expand only if needed

**Token savings:** ~60% for common cases

---

#### Pattern 3: Structured Reference

**API reference:**

```markdown
### functionName()

**Signature:**
```typescript
functionName(param: Type): ReturnType
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| param | Type | Yes | [Brief] |

**Returns:** Type - [Brief]

**Example:**
```typescript
const result = functionName('value')
```

[Layer 3: Full examples, error handling, edge cases]
```

**Why:** AI can extract signature and params without reading prose

---

### Token Optimization Techniques

#### Technique 1: Structured Over Prose

**Instead of:**
```markdown
The authentication system uses better-auth which is a great library
that provides email/password authentication along with API keys for
kiosks. Sessions last 7 days and API keys last 1 year.
```

**Use:**
```markdown
**Auth:** better-auth

**Methods:**
- Email/password (admin)
- API keys (kiosks)

**Duration:**
- Sessions: 7 days
- API keys: 1 year
```

**Savings:** ~30 tokens (40%)

---

#### Technique 2: Tables Over Lists

**Instead of:**
```markdown
- tutorial.md for learning-oriented content in tutorials directory
- howto.md for task-oriented guides in howto directory
- reference.md for information-oriented specs in reference directory
```

**Use:**
```markdown
| Type | File | Location |
|------|------|----------|
| Tutorial | tutorial.md | tutorials/ |
| How-to | howto.md | howto/ |
| Reference | reference.md | reference/ |
```

**Savings:** ~25 tokens (35%)

---

#### Technique 3: Code Over Prose

**Instead of:**
```markdown
To create a new repository, you should inject the Prisma client in
the constructor and then use it in all your methods by calling
this.prisma instead of using the global prisma instance.
```

**Use:**
```typescript
// Repository pattern
constructor(private prisma: PrismaClient) {}

// Use injected client
async findById(id: string) {
  return this.prisma.model.findUnique({ where: { id } })
}
```

**Savings:** ~40 tokens (60%)

---

#### Technique 4: Abbreviations in Context

**Use:** Full terms on first use, abbreviations after:

```markdown
Architecture Decision Records (ADRs) document decisions. ADRs are
immutable after acceptance. Create an ADR when...

[Later in same doc]
See ADR-0001 for details.
```

**Don't:** Abbreviate without definition or in titles

---

### Trigger Keyword Strategy

#### Selecting Triggers

**Good triggers:**
- Technical terms: `testcontainers`, `better-auth`, `prisma`
- Domain names: `personnel`, `checkin`, `authentication`
- File concepts: `repository`, `service`, `route`
- Patterns: `integration-testing`, `dependency-injection`

**Bad triggers:**
- Generic: `code`, `test`, `function`
- Too broad: `backend`, `frontend`, `docs`
- Ambiguous: `setup`, `config`, `util`

---

#### Trigger Density

**How many triggers?**

- CLAUDE.md: 6-10 (broad coverage)
- Domain docs: 5-8 (focused area)
- How-to: 4-6 (specific task)
- ADR: 3-5 (decision keywords)

**Example:**

```yaml
# Good: Specific and relevant
triggers:
  - testcontainers
  - integration-testing
  - docker
  - test-database
  - vitest

# Bad: Too generic
triggers:
  - testing
  - backend
  - code
```

---

#### Trigger Hierarchy

**Layer triggers by specificity:**

**Specific** (high match confidence):
- `testcontainers`, `better-auth`
- Load when exact match needed

**Domain** (medium confidence):
- `authentication`, `testing`
- Load when working in domain

**General** (low confidence):
- `backend`, `repository`
- Load only with other matching signals

---

### Context Loading Strategies

#### Loading Modes

**`context_load: always`**

**Use for:**
- Active plans
- Current phase documentation
- Accepted ADRs affecting current work

**Token budget:** 2000-3000 (always in context)

**Example:**
```yaml
# Backend rebuild plan (currently executing)
context_load: always
```

---

**`context_load: on-demand`**

**Use for:**
- Most documentation (95%)
- How-to guides
- Reference docs
- Explanations

**Token budget:** 500-1500 (load when triggered)

**Example:**
```yaml
# Authentication how-to guide
context_load: on-demand
triggers: [auth, login, authentication]
```

---

**`context_load: never`**

**Use for:**
- Historical context only
- Superseded ADRs
- Completed plans
- Archived sessions

**Token budget:** 0 (never auto-load)

**Example:**
```yaml
# Completed plan from 6 months ago
context_load: never
status: completed
```

---

### Token Budget Guidelines

**How to estimate token budget:**

**Rule of thumb:** ~4 characters per token (English)

**Formula:**
```
token_budget = (character_count / 4) * 1.1
```

**Multiply by 1.1 for:**
- Code blocks (less dense)
- Tables (structure overhead)
- Markdown formatting

---

**Typical budgets by document type:**

| Document Type | Token Budget | Rationale |
|---------------|--------------|-----------|
| CLAUDE.md | 500-800 | Quick reference layer |
| How-to guide | 800-1200 | Task focused |
| Tutorial | 1200-1800 | Learning needs examples |
| Reference | 1500-2500 | Complete API specs |
| Explanation | 1500-2000 | Conceptual depth |
| ADR | 1000-1500 | Decision detail |
| RFC | 1800-2500 | Proposal complexity |
| Plan | 2000-3000 | Implementation phases |
| Research | 1500-2000 | Findings and analysis |
| Session | 1000-1500 | Work summary |

---

### Metadata Best Practices

#### Complete Frontmatter

**Always include:**

```yaml
---
type: [doc-type]
title: "Human-Readable Title"
status: [draft|published|deprecated]
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
ai:
  priority: [high|medium|low]
  context_load: [always|on-demand|never]
  triggers: [specific, relevant, keywords]
  token_budget: [estimated-tokens]
---
```

**Optional but helpful:**

```yaml
difficulty: [easy|medium|hard]        # For tutorials/how-tos
estimated_time: "X minutes"            # For tutorials/how-tos
prerequisites: [list]                  # For learning docs
version: "1.0.0"                       # For reference docs
stability: [stable|beta|alpha]         # For reference docs
lifecycle: [draft|active|completed]    # For temporal docs
reviewed: YYYY-MM-DD                   # For temporal docs
expires: YYYY-MM-DD                    # For temporal docs
```

---

#### Priority Assignment

**High priority:**
- Active implementation plans
- Core ADRs (integration-first, better-auth, monorepo)
- Domain CLAUDE.md files
- Primary how-to guides

**Medium priority:**
- Most how-to guides
- Explanations
- Tutorials
- Completed plans (recent)

**Low priority:**
- Historical ADRs
- Archived plans
- Old session reports
- Deprecated docs

**Rule:** If AI should load this frequently, it's high. If occasionally, medium. If rarely, low.

---

### Document Atomicity

#### One Concept Per Document

**Test:** Can you describe the document in one sentence?

**Good (atomic):**
- "Direction detection in check-in system"
- "API key management with better-auth"
- "Testcontainers setup for integration tests"

**Bad (not atomic):**
- "Authentication system" (too broad)
- "How to use the backend" (way too broad)
- "Testing and CI/CD" (two concepts)

---

#### When to Split Documents

**Split when:**

1. **Multiple audiences:**
   ```
   authentication-guide.md (for users and developers)
   →
   - authentication-for-users.md
   - authentication-for-developers.md
   ```

2. **Multiple concepts:**
   ```
   testing-guide.md (unit, integration, e2e)
   →
   - integration-testing-strategy.md
   - unit-testing-guidelines.md
   - e2e-testing-setup.md
   ```

3. **Mixed document types:**
   ```
   api-documentation.md (tutorial + reference)
   →
   - tutorial-first-api-call.md
   - reference-api-endpoints.md
   ```

---

#### Dense Linking

**Every atomic doc should link to:**

- Related concepts (2-5 links)
- Prerequisite knowledge (1-3 links)
- Deeper dives (2-4 links)
- Practical applications (1-3 links)

**Example:**

```markdown
## Related Documentation

**Prerequisites:**
- [Authentication Basics](auth-basics.md)

**Related Concepts:**
- [Session Management](session-management.md)
- [API Key Security](api-key-security.md)

**How-to Guides:**
- [How to Create API Keys](../howto/create-api-key.md)

**Reference:**
- [Auth API Reference](../reference/auth-api.md)
```

---

## Layer 3: Advanced Techniques

### Multi-Modal Documentation

**Combine formats for efficiency:**

#### Diagrams

**ASCII diagrams save tokens:**

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────>│   API    │────>│ Database │
└──────────┘     └──────────┘     └──────────┘
```

**Vs prose:**
"The client sends requests to the API, which then queries the database..."

**Savings:** ~40 tokens (70%)

---

#### Flow Charts

```
Badge Scan → Validate → Check Last → Determine Direction → Create Check-in
                  ↓           ↓
               Error      Not found
```

**Vs:**
"When a badge is scanned, the system first validates it. If validation succeeds, it checks the last check-in. Based on the last check-in, it determines the direction. Finally, it creates the check-in record. If validation fails or the badge is not found, an error is returned."

**Savings:** ~60 tokens (75%)

---

#### State Machines

```
draft → active → completed
              ↓
           archived
              ↓
         superseded
```

**Extremely token-efficient for state transitions**

---

### Context Window Management

**For AI with 200K token context:**

#### Prioritization Strategy

**Always-loaded (Tier 1):** 10-15K tokens
- Active plans (2-3K each)
- Core ADRs (1-2K each)
- Current phase docs (2-3K)

**On-demand (Tier 2):** 50-100K tokens
- Domain docs (5-10K per domain)
- How-to guides (1-2K each)
- Reference docs (2-3K each)

**Historical (Tier 3):** Never auto-load
- Completed plans
- Old sessions
- Superseded ADRs

---

### Dynamic Loading Patterns

#### Breadcrumb Loading

**Pattern:** Load parent CLAUDE.md first, then specific docs

```
1. User asks about "authentication API endpoints"
2. Load docs/CLAUDE.md (500 tokens) - Identifies domains/
3. Load docs/domains/CLAUDE.md (300 tokens) - Identifies authentication/
4. Load docs/domains/authentication/CLAUDE.md (600 tokens) - Lists docs
5. Load docs/guides/reference/auth-api.md (2000 tokens) - The answer

Total: 3400 tokens with navigation context
```

**Vs loading entire domain:** ~15K tokens

**Savings:** 11.6K tokens (77%)

---

#### Trigger-Based Loading

**Pattern:** Load docs matching multiple triggers

```
User: "How do I set up testcontainers for integration tests?"

Triggers matched:
- testcontainers
- integration-testing
- setup

Docs loaded:
- docs/cross-cutting/testing/CLAUDE.md (triggers: testing, integration-testing)
- docs/guides/howto/setup-testcontainers.md (triggers: testcontainers, setup, testing)

Total: ~1500 tokens
```

**Precise loading without exploring entire testing docs**

---

### Versioning for AI

#### Breaking Change Signals

**In frontmatter:**

```yaml
version: "2.0.0"
breaking_changes:
  - version: "2.0.0"
    date: "2026-01-15"
    description: "Changed repository constructor signature"
    migration: "docs/guides/howto/migrate-v2.md"
```

**AI can:**
- Detect version mismatches
- Warn about breaking changes
- Link to migration guides

---

#### Deprecation Warnings

```yaml
status: deprecated
deprecated_date: "2026-01-01"
deprecated_reason: "Replaced by better-auth"
superseded_by: "docs/guides/explanation/better-auth-architecture.md"
removal_date: "2026-03-01"
```

**AI can:**
- Avoid suggesting deprecated approaches
- Recommend current alternatives
- Warn about upcoming removals

---

### Token Recovery Techniques

#### Eliminate Filler Words

**Before (58 tokens):**
> "In order to set up the testing infrastructure, you will need to first install testcontainers and then you should configure the database connection string in your test files."

**After (30 tokens):**
> "Install testcontainers. Configure database connection in test files."

**Savings:** 28 tokens (48%)

---

#### Use Lists Over Sentences

**Before (45 tokens):**
> "The system supports email/password authentication for administrators and API key authentication for automated kiosk terminals that need programmatic access."

**After (22 tokens):**
> **Auth methods:**
> - Email/password (admins)
> - API keys (kiosks)

**Savings:** 23 tokens (51%)

---

#### Abbreviate Repetition

**Before (80 tokens):**
> "Create a repository for members. The repository should handle CRUD operations for members. The repository must use dependency injection. The repository should have integration tests."

**After (42 tokens):**
> **Member repository requirements:**
> - CRUD operations
> - Dependency injection
> - Integration tests

**Savings:** 38 tokens (48%)

---

## Measurement & Validation

### Token Budget Validation

**Check token usage:**

```bash
# Estimate tokens (approximate)
wc -c file.md | awk '{print int($1 / 4 * 1.1)}'
```

**Compare to frontmatter `token_budget`**

**If over budget:**
1. Remove fluff
2. Convert prose to structure
3. Split document
4. Move details to Layer 3

---

### Trigger Effectiveness

**Test triggers:**

```markdown
# Test: Does this doc load for these queries?

Triggers: [testcontainers, integration-testing, docker]

Test queries:
✅ "How do I use testcontainers?"
✅ "Set up integration tests"
❌ "Write unit tests" (shouldn't match)
✅ "Docker for testing"
```

**If not matching correctly:**
- Add missing triggers
- Remove overly broad triggers
- Adjust priority

---

### Loading Performance

**Measure context size:**

```
# Tokens loaded for user query
Always loaded: 12K tokens
Triggered docs: 8K tokens
Total: 20K tokens (10% of 200K context)
```

**If too high:**
- Reduce always-loaded set
- Increase atomicity
- Improve triggers (less false positives)

---

## Examples

### Good AI-First Documentation

#### Example 1: CLAUDE.md

```markdown
# Authentication Domain (AI-First Guide)

**Triggers:** auth, authentication, login, session, api-key, better-auth

---

## Quick Reference

**System:** better-auth

**Methods:**
- Email/password (admins, 7-day sessions)
- API keys (kiosks, 1-year validity)

**Code:** [apps/backend/src/lib/auth.ts](../../apps/backend/src/lib/auth.ts)

**Key docs:**
- [Architecture](explanation-auth-architecture.md)
- [API Reference](reference-auth-api.md)
- [How to Create API Key](../howto/create-api-key.md)

---

## [Layer 2: Detailed content...]
```

**Why good:**
- Quick reference in ~80 tokens
- Clear triggers
- Immediate links to detailed docs
- Structured data (not prose)

---

#### Example 2: How-to Guide

```markdown
# How to Create API Key

**Triggers:** api-key, create, better-auth

---

## Quick Solution

```bash
pnpm tsx scripts/create-api-key.ts [name]
```

**For security considerations and usage, continue reading.**

---

## [Detailed steps...]
```

**Why good:**
- Solution in ~20 tokens
- Can stop after quick solution
- Optional deep dive

---

### Poor AI-First Documentation

#### Example 1: Verbose Prose

```markdown
# Authentication

Authentication is a very important part of our system. We need to make
sure users are who they say they are. There are many ways to do
authentication. We chose better-auth because it's a good library that
many people use. It provides lots of features including email and
password authentication which is what administrators use to log in to
the system...

[Continues for 500 tokens before getting to the point]
```

**Problems:**
- Excessive prose
- No structure
- No quick reference
- Buried information

---

#### Example 2: Missing Metadata

```markdown
# API Documentation

[No frontmatter, no triggers, no token budget]

Here's how our API works...
```

**Problems:**
- AI doesn't know when to load
- No priority signal
- No token planning
- Can't route efficiently

---

## Related Documentation

**Meta docs:**
- [Style Guide](style-guide.md) - Writing conventions
- [Health Tracking](health-tracking.md) - Monitoring docs
- [Diátaxis Guide](diataxis-guide.md) - Document classification

**Implementation:**
- [Documentation Plan](../plans/active/2026-01-19-ai-first-documentation-system.md)

**Root:**
- [Documentation System](../CLAUDE.md)

---

**Last Updated:** 2026-01-19
