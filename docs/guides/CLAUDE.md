# Guides Documentation (AI-First Guide)

**Purpose:** Diátaxis-organized documentation guide

**AI Context Priority:** high

**When to Load:** User creating documentation, learning system, solving tasks

---

## Quick Reference

### What's Here

Diátaxis-organized documentation:
- **[Tutorials](tutorials/)** - Learning-oriented, step-by-step
- **[How-to Guides](howto/)** - Task-oriented solutions
- **[Reference](reference/)** - Information-oriented specs
- **[Explanation](explanation/)** - Understanding-oriented concepts

### The Diátaxis Framework

Four distinct documentation types, each serving different user needs:

| Type | Purpose | User Need |
|------|---------|-----------|
| **Tutorial** | Learning | "I want to learn" |
| **How-to** | Solving | "I need to accomplish X" |
| **Reference** | Lookup | "I need to look up X" |
| **Explanation** | Understanding | "I want to understand why" |

---

## When to Use Guides vs. Domains

### Use Guides When

**Document type is most important:**
- Creating learning materials → tutorials/
- Writing task solutions → howto/
- Documenting specifications → reference/
- Explaining concepts → explanation/

**Examples:**
- "Tutorial: Getting Started with Sentinel"
- "How to Deploy to Production"
- "API Endpoints Reference"
- "Testing Philosophy Explained"

### Use Domains When

**Business domain is most important:**
- Authentication-specific docs → domains/authentication/
- Member management docs → domains/personnel/
- Check-in docs → domains/checkin/

**Note:** Domain directories can contain all document types (explanation, reference, how-to) for that specific domain.

---

## Directory Structure

### Guides Organization

```
guides/
├── tutorials/              # Learning-oriented
│   ├── CLAUDE.md
│   └── getting-started.md
├── howto/                  # Task-oriented
│   ├── CLAUDE.md
│   └── add-repository.md
├── reference/              # Information-oriented
│   ├── CLAUDE.md
│   └── api-endpoints.md
└── explanation/            # Understanding-oriented
    ├── CLAUDE.md
    └── testing-philosophy.md
```

### File Naming in Guides

**Type prefix optional** (implied by directory):
- In `tutorials/`: `getting-started.md` (not `tutorial-getting-started.md`)
- In `howto/`: `add-repository.md` (not `howto-add-repository.md`)
- In `reference/`: `api-endpoints.md` (not `reference-api-endpoints.md`)

**Why:** Directory already indicates type

---

## The Four Types Explained

### Tutorials (Learning)

**Purpose:** Teach through practice
**Audience:** Beginners to the system
**Tone:** Patient, explanatory, encouraging

**Characteristics:**
- Step-by-step instructions
- Safe practice environment
- Explains concepts along the way
- Builds confidence

**Example:** "Tutorial: Writing Your First Integration Test"

**See:** [Tutorials CLAUDE.md](tutorials/CLAUDE.md)

### How-to Guides (Tasks)

**Purpose:** Solve specific problems
**Audience:** Practitioners with familiarity
**Tone:** Direct, concise, practical

**Characteristics:**
- Goal-oriented
- Minimal explanation
- Assumes working system
- Focused on result

**Example:** "How to Add a New Repository"

**See:** [How-to CLAUDE.md](howto/CLAUDE.md)

### Reference (Specifications)

**Purpose:** Provide complete information
**Audience:** Anyone needing facts
**Tone:** Precise, complete, factual

**Characteristics:**
- Comprehensive
- Organized by structure
- Tables, parameters, types
- No narrative

**Example:** "API Endpoints Reference"

**See:** [Reference CLAUDE.md](reference/CLAUDE.md)

### Explanation (Understanding)

**Purpose:** Illuminate concepts
**Audience:** Decision-makers, learners
**Tone:** Thoughtful, analytical, balanced

**Characteristics:**
- Conceptual understanding
- Why, not how
- Alternatives discussed
- Trade-offs explained

**Example:** "Why Integration-First Testing"

**See:** [Explanation CLAUDE.md](explanation/CLAUDE.md)

---

## Classification Decision Tree

```
What does the user need?

"I want to learn" → Tutorial
  └─ Teaching new concepts through practice

"I need to do X" → How-to
  └─ Solving specific practical problem

"What is X?" → Reference
  └─ Looking up specifications

"Why X?" → Explanation
  └─ Understanding concepts and rationale
```

---

## Never Mix Types

**❌ Bad:** Mixing tutorial + reference in one document

**✅ Good:** Separate documents, cross-referenced

**Example:**
```markdown
<!-- tutorials/getting-started.md -->
# Getting Started Tutorial

[Tutorial content...]

## Next Steps
- [Member API Reference](../reference/member-api.md)
- [How to Add Members](../howto/add-member.md)
```

---

## Related Documentation

**Domain docs:**
- [Domains](../domains/CLAUDE.md) - When to use domain directories

**Templates:**
- [Templates](../templates/CLAUDE.md) - Document templates

**Meta:**
- [Diátaxis Guide](../meta/diataxis-guide.md) - Complete classification guide (coming soon)

---

**Last Updated:** 2026-01-19
