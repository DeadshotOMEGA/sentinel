---
type: meta
title: "Diátaxis Classification Guide"
status: published
created: 2026-01-19
last_updated: 2026-01-19
ai:
  priority: high
  context_load: on-demand
  triggers:
    - diataxis
    - classification
    - tutorial
    - howto
    - reference
    - explanation
    - document-types
  token_budget: 2200
---

# Diátaxis Classification Guide

**Purpose:** Complete guide to classifying documentation using the Diátaxis framework

**Audience:** Documentation writers

**Source:** Based on [Diátaxis Framework](https://diataxis.fr/) by Daniele Procida

---

## Layer 1: Quick Classification (Essential)

### The Four Document Types

```
             Practical              Theoretical
            (doing)                 (thinking)

Learning:   TUTORIAL               EXPLANATION

Working:    HOW-TO GUIDE           REFERENCE
```

---

### Quick Decision Tree

```
Ask yourself:
"Why would someone read this?"

└─ To learn a new skill?
   └─ TUTORIAL (learning-oriented)

└─ To solve a specific problem?
   └─ HOW-TO (task-oriented)

└─ To look up information?
   └─ REFERENCE (information-oriented)

└─ To understand why/how something works?
   └─ EXPLANATION (understanding-oriented)
```

---

### One-Line Descriptions

**Tutorial:** "Learn by doing" - takes learner from zero to working knowledge

**How-to:** "Solve this problem" - accomplishes specific goal step-by-step

**Reference:** "Look this up" - technical description of machinery and operation

**Explanation:** "Understand this" - clarifies and illuminates a particular topic

---

## Layer 2: Detailed Classification

### Tutorial (Learning-Oriented)

#### Purpose

**Goal:** Enable a complete beginner to achieve a basic competence

**Audience:** Newcomers who want to learn

**Form:** A lesson that teaches

**Analogy:** Teaching a child to cook their first meal

---

#### Characteristics

**Tutorials are:**
- Learning-focused (not reference)
- Practical (hands-on, not theory)
- Sequential (step-by-step progression)
- Complete (don't skip steps)
- Repeatable (anyone can follow)
- Safe (can't break things)

**Tutorials provide:**
- Clear learning path
- Immediate results
- Sense of achievement
- Confidence building

---

#### Structure

```markdown
# Tutorial: [Topic] for Beginners

## What You'll Learn
- [Skill 1]
- [Skill 2]

## Prerequisites
- [Minimal requirements]

## Step 1: [First Lesson]
[Learn by doing]

## Step 2: [Build on Step 1]
[Progressive learning]

## Bringing It All Together
[What you accomplished]

## Next Steps
[Where to learn more]
```

---

#### Writing Guidelines

**Do:**
- ✅ Provide complete, working examples
- ✅ Test every step yourself
- ✅ Explain what's happening
- ✅ Build confidence
- ✅ Use "you will" language
- ✅ Show expected results

**Don't:**
- ❌ Explain everything (save for explanation docs)
- ❌ Offer choices (follow one path)
- ❌ Skip steps (complete is better than concise)
- ❌ Assume prior knowledge
- ❌ Introduce complexity too early

---

#### Examples

**Good tutorial titles:**
- "Getting Started with Testcontainers"
- "Your First Integration Test"
- "Building Your First Repository"
- "Introduction to ts-rest"

**Bad tutorial titles:**
- "Testcontainers Reference" (that's a reference doc)
- "How to Fix Testcontainers Errors" (that's a how-to)
- "Understanding Testcontainers Architecture" (that's an explanation)

---

### How-to Guide (Task-Oriented)

#### Purpose

**Goal:** Show how to solve a specific, real-world problem

**Audience:** Practitioners who want to accomplish something

**Form:** Directions that guide

**Analogy:** A recipe for a specific dish

---

#### Characteristics

**How-tos are:**
- Goal-focused (accomplish X)
- Practical (actionable steps)
- Flexible (adaptable to variations)
- Assume knowledge (not for beginners)
- Problem-solving (start with problem)

**How-tos provide:**
- Solution to specific problem
- Clear steps to follow
- Variations and alternatives
- Troubleshooting

---

#### Structure

```markdown
# How to [Accomplish Task]

**Goal:** [What you'll accomplish]

## When to Use This Guide
[Specific scenarios]

## Quick Solution
[For experienced users]

## Prerequisites
[What you need to know]

## Step-by-Step Instructions

### Step 1: [Action]
[What to do]

### Step 2: [Action]
[What to do]

## Verification
[How to confirm success]

## Troubleshooting
[Common issues]

## Alternatives
[Other approaches]
```

---

#### Writing Guidelines

**Do:**
- ✅ Start with the goal
- ✅ Provide quick solution first
- ✅ Offer alternatives and variations
- ✅ Include troubleshooting
- ✅ Use imperative mood ("Run", "Create", "Configure")
- ✅ Address edge cases

**Don't:**
- ❌ Teach from scratch (assume knowledge)
- ❌ Explain concepts (save for explanation docs)
- ❌ Include only one approach (offer alternatives)
- ❌ Bury the solution (quick solution first)
- ❌ Skip verification steps

---

#### Examples

**Good how-to titles:**
- "How to Set Up Testcontainers"
- "How to Create API Keys"
- "How to Configure Testcontainers Reuse"
- "How to Migrate Repositories to New Pattern"

**Bad how-to titles:**
- "Learning Testcontainers" (that's a tutorial)
- "Testcontainers API" (that's reference)
- "Why We Use Testcontainers" (that's an explanation)

---

### Reference (Information-Oriented)

#### Purpose

**Goal:** Describe the machinery and how to operate it

**Audience:** Practitioners who need to look things up

**Form:** Dry description

**Analogy:** Encyclopedia article

---

#### Characteristics

**References are:**
- Information-dense (facts, not prose)
- Complete (covers everything)
- Accurate (reflects current state)
- Structured (consistent format)
- Searchable (easy to scan)

**References provide:**
- Technical specifications
- API signatures
- Configuration options
- Type definitions
- Error codes

---

#### Structure

```markdown
# [Component/API] Reference

**Version:** X.Y.Z

## Overview
[Brief description]

## API Reference

### functionName()

**Signature:**
```typescript
functionName(param: Type): ReturnType
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| param | Type | Yes | [Info] |

**Returns:** [Type description]

**Throws:** [Error types]

**Example:**
```typescript
const result = functionName('value')
```

## Configuration
[All options with types and defaults]

## Error Reference
[All possible errors]
```

---

#### Writing Guidelines

**Do:**
- ✅ Be accurate and complete
- ✅ Use consistent structure
- ✅ Include all parameters/options
- ✅ Provide type information
- ✅ Use tables for structured data
- ✅ Keep examples minimal (just show syntax)

**Don't:**
- ❌ Explain concepts (save for explanation docs)
- ❌ Teach how to use it (save for tutorials/how-tos)
- ❌ Include opinions or recommendations
- ❌ Use prose when structure works better
- ❌ Skip any part of the API

---

#### Examples

**Good reference titles:**
- "Authentication API Reference"
- "Member Repository Reference"
- "Testcontainers Configuration Reference"
- "Error Code Reference"

**Bad reference titles:**
- "Learning the Auth API" (that's a tutorial)
- "How to Call the Auth API" (that's a how-to)
- "Understanding Auth Architecture" (that's an explanation)

---

### Explanation (Understanding-Oriented)

#### Purpose

**Goal:** Clarify, deepen, and broaden the reader's understanding

**Audience:** Practitioners who want to understand

**Form:** Discursive explanation

**Analogy:** Article explaining why cuisines developed differently

---

#### Characteristics

**Explanations are:**
- Understanding-focused (why/how, not what/how-to)
- Theoretical (concepts, not steps)
- Contextual (history, alternatives, trade-offs)
- Discussion-oriented (explores topic)

**Explanations provide:**
- Conceptual understanding
- Design rationale
- Historical context
- Trade-off analysis
- Mental models

---

#### Structure

```markdown
# [Concept] Explained

**What:** [Brief description]

## The Big Picture
[High-level context]

## The Problem
[What problem does this solve?]

## How It Works
[Mechanism explained]

## Design Decisions
[Why this way?]

## Trade-offs
[What we gain/lose]

## Comparison with Alternatives
[Why not alternative approaches?]

## Implications
[What this means for users/developers]

## Real-World Examples
[Concrete applications]
```

---

#### Writing Guidelines

**Do:**
- ✅ Provide context and background
- ✅ Explain design rationale
- ✅ Discuss alternatives and trade-offs
- ✅ Use analogies and metaphors
- ✅ Connect to bigger picture
- ✅ Address "why" questions

**Don't:**
- ❌ Provide step-by-step instructions
- ❌ Include complete API documentation
- ❌ Teach from scratch
- ❌ Make it a reference manual
- ❌ Focus only on "what" without "why"

---

#### Examples

**Good explanation titles:**
- "Integration-First Testing Strategy"
- "Understanding Direction Detection"
- "Authentication Architecture"
- "Why Testcontainers Over Mocks"

**Bad explanation titles:**
- "Getting Started with Testing" (that's a tutorial)
- "How to Write Integration Tests" (that's a how-to)
- "Testing API Reference" (that's reference)

---

## Layer 3: Advanced Classification

### Decision Trees

#### Tutorial vs. How-to

```
Start: Document involves steps

Question 1: Is the reader a complete beginner to this topic?
├─ Yes: Likely TUTORIAL
└─ No: Continue

Question 2: Is the goal to learn the concept/tool generally?
├─ Yes: TUTORIAL
└─ No: Continue

Question 3: Is the goal to solve a specific, practical problem?
├─ Yes: HOW-TO
└─ No: Re-evaluate (might be explanation)

Question 4: Does it start from zero knowledge?
├─ Yes: TUTORIAL
└─ No: HOW-TO

Question 5: Does it follow ONE path to learning?
├─ Yes: TUTORIAL
└─ No (offers alternatives): HOW-TO
```

**Example:**

```
"Setting up your first integration test"
├─ Complete beginner? Yes
├─ Learning generally? Yes
└─ Classification: TUTORIAL

"How to add integration tests to existing repository"
├─ Complete beginner? No
├─ Specific problem? Yes
└─ Classification: HOW-TO
```

---

#### Reference vs. Explanation

```
Start: Document describes something

Question 1: Is the primary purpose to look things up?
├─ Yes: REFERENCE
└─ No: Continue

Question 2: Is it primarily facts and specifications?
├─ Yes: REFERENCE
└─ No: Continue

Question 3: Is the purpose to understand why/how it works?
├─ Yes: EXPLANATION
└─ No: Continue

Question 4: Does it need to be 100% accurate to current code?
├─ Yes: REFERENCE
└─ No (conceptual): EXPLANATION

Question 5: Is it structured as tables/specs or prose/discussion?
├─ Tables/specs: REFERENCE
└─ Prose/discussion: EXPLANATION
```

**Example:**

```
"Authentication API endpoints"
├─ Purpose: look up? Yes
├─ Facts/specs? Yes
└─ Classification: REFERENCE

"Authentication architecture and design"
├─ Purpose: look up? No
├─ Understand why? Yes
└─ Classification: EXPLANATION
```

---

### Edge Cases

#### Case 1: Document with Multiple Types

**Problem:** "How to set up auth" teaches concepts AND solves a task

**Solution:** Split into two documents:

```
Before:
└─ how-to-setup-auth.md (confused, 3000 tokens)

After:
├─ tutorial-getting-started-auth.md (learning-oriented)
└─ howto-setup-auth-production.md (task-oriented)
```

**Rule:** If a document serves two purposes, it's two documents

---

#### Case 2: Quick Reference in Tutorial

**Problem:** Tutorial needs to include API reference for clarity

**Solution:** Keep tutorial focused, link to reference:

```markdown
# Tutorial: Your First API Call

## Step 3: Call the API

Use the `login()` function:

```typescript
const result = await auth.login(email, password)
```

For complete API details, see [Auth API Reference](../reference/auth-api.md).

Now that you have the token...
```

**Rule:** Minimal reference embedded, link to complete reference doc

---

#### Case 3: Explanation in How-to

**Problem:** How-to needs to explain "why" to avoid confusion

**Solution:** Brief explanation inline, link to full explanation:

```markdown
# How to Set Up API Keys

API keys provide long-lived authentication for kiosks (sessions
would expire too quickly).

For complete security discussion, see [API Key Security](../explanation/api-key-security.md).

## Steps

1. Generate key...
```

**Rule:** Minimal context, link to full explanation

---

#### Case 4: "Overview" Documents

**Problem:** What is an "overview" document?

**Analysis:**

```
"Overview of authentication system"

What does it do?
├─ Teach from scratch? → Tutorial
├─ Solve specific problem? → How-to
├─ List all features/APIs? → Reference
└─ Explain architecture and design? → Explanation
```

**Solution:** "Overview" is not a type. Classify by purpose:

- Learning overview → Tutorial ("Getting Started with Auth")
- Working overview → Multiple how-tos or reference
- Understanding overview → Explanation ("Auth Architecture")

**Rule:** No "overview" documents. Choose a real type.

---

#### Case 5: Multi-Page Concepts

**Problem:** Topic too big for one document

**Solution:** Create parent explanation + specific sub-docs:

```
authentication/
├─ explanation-auth-architecture.md (parent: big picture)
├─ explanation-session-management.md (sub: sessions)
├─ explanation-api-key-design.md (sub: API keys)
└─ explanation-security-model.md (sub: security)
```

**Parent doc structure:**

```markdown
# Authentication Architecture

[High-level overview]

## Components

This section provides an overview. See individual docs for details:

- [Session Management](explanation-session-management.md)
- [API Key Design](explanation-api-key-design.md)
- [Security Model](explanation-security-model.md)
```

**Rule:** Parent gives map, children provide details

---

### Classification Examples

#### Example 1: Integration Testing

**Topic:** Integration testing with Testcontainers

**Documents needed:**

```
tutorials/
└─ tutorial-first-integration-test.md
   Purpose: Teach beginners how to write their first integration test
   Starts: From zero
   Ends: Working test with Testcontainers

howto/
├─ howto-setup-testcontainers.md
   Purpose: Set up Testcontainers in existing project
   Assumes: Know what integration tests are
   Solves: Configuration problem

├─ howto-speed-up-tests.md
   Purpose: Optimize test performance
   Assumes: Tests already exist
   Solves: Slow tests

└─ howto-debug-failing-tests.md
   Purpose: Troubleshoot test failures
   Assumes: Tests exist but fail
   Solves: Debugging problem

reference/
└─ reference-testcontainers-api.md
   Purpose: Look up Testcontainers methods
   Content: API signatures, options, examples
   Use: Quick reference while coding

explanation/
├─ explanation-integration-first-strategy.md
   Purpose: Understand why integration-first
   Content: Philosophy, trade-offs, rationale
   Use: Understand approach

└─ explanation-testcontainers-architecture.md
   Purpose: Understand how Testcontainers works
   Content: Docker interaction, lifecycle, internals
   Use: Deep understanding
```

---

#### Example 2: Authentication

**Topic:** Authentication system with better-auth

**Documents needed:**

```
tutorials/
└─ tutorial-first-login.md
   "Your first authenticated API call"
   Teaches: Complete beginner how to log in

howto/
├─ howto-create-api-key.md
   "How to create API keys for kiosks"
   Solves: Need API key for automation

├─ howto-implement-protected-route.md
   "How to protect routes with authentication"
   Solves: Adding auth to new endpoint

└─ howto-refresh-tokens.md
   "How to handle token expiry"
   Solves: Session management

reference/
├─ reference-auth-api.md
   "Authentication API Reference"
   Lists: All auth endpoints with signatures

└─ reference-auth-errors.md
   "Authentication Error Codes"
   Lists: All error codes and meanings

explanation/
├─ explanation-auth-architecture.md
   "Authentication Architecture"
   Explains: Overall design and choices

├─ explanation-session-management.md
   "How Session Management Works"
   Explains: Session lifecycle and storage

└─ explanation-security-model.md
   "Authentication Security Model"
   Explains: Threat model and mitigations
```

---

### Common Mistakes

#### Mistake 1: "Reference Tutorial"

**Problem:**

```markdown
# Tutorial: API Reference

Here are all the functions...
[Lists API without teaching]
```

**Why wrong:** Tutorials teach, references list

**Fix:** Make it a real tutorial or real reference

---

#### Mistake 2: "How-to Explanation"

**Problem:**

```markdown
# How to Understand Architecture

First, let's discuss why we chose this design...
[Long explanation, no actionable steps]
```

**Why wrong:** How-tos solve problems, explanations clarify concepts

**Fix:** Make it "Architecture Explained" or split into explanation + how-tos

---

#### Mistake 3: "Tutorial That Skips Steps"

**Problem:**

```markdown
# Tutorial: Getting Started

1. Set up auth (see documentation)
2. Configure (you know how)
3. Done!
```

**Why wrong:** Tutorials must be complete and teach from zero

**Fix:** Include all steps or make it a how-to

---

#### Mistake 4: "Explanation With No Concepts"

**Problem:**

```markdown
# Explanation: API Usage

Here's how to call the API...
[Just instructions, no concepts]
```

**Why wrong:** Explanations clarify understanding, not provide instructions

**Fix:** Make it a how-to or add actual conceptual content

---

## Classification Checklist

**Before publishing, verify:**

### Tutorial Checklist
- [ ] Starts from zero knowledge
- [ ] Every step is included and tested
- [ ] Builds one thing from start to finish
- [ ] Provides sense of accomplishment
- [ ] Links to how-tos and reference for next steps

### How-to Checklist
- [ ] Solves specific, practical problem
- [ ] States goal clearly upfront
- [ ] Provides quick solution first
- [ ] Assumes reader has basic knowledge
- [ ] Includes troubleshooting
- [ ] Offers alternatives

### Reference Checklist
- [ ] Describes current implementation accurately
- [ ] Uses consistent structure throughout
- [ ] Includes all parameters/options/errors
- [ ] Provides type information
- [ ] Uses tables for structured data
- [ ] Minimal prose, maximum information density

### Explanation Checklist
- [ ] Answers "why" and "how" (not "how-to")
- [ ] Provides context and background
- [ ] Discusses design rationale
- [ ] Compares alternatives and trade-offs
- [ ] Uses analogies and examples
- [ ] Deepens understanding

---

## Related Documentation

**Meta docs:**
- [Style Guide](style-guide.md) - Writing conventions
- [AI-First Principles](ai-first-principles.md) - AI optimization
- [Health Tracking](health-tracking.md) - Monitoring docs

**Templates:**
- [Tutorial Template](../templates/tutorial.md)
- [How-to Template](../templates/howto.md)
- [Reference Template](../templates/reference.md)
- [Explanation Template](../templates/explanation.md)

**External:**
- [Diátaxis Framework](https://diataxis.fr/) - Original framework by Daniele Procida

---

**Last Updated:** 2026-01-19
