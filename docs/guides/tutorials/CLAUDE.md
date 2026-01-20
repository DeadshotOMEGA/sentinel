# Tutorials (AI-First Guide)

**Purpose:** Learning-oriented step-by-step guides

**AI Context Priority:** medium

**When to Load:** User wants to learn new concepts, beginner questions

**Triggers:** tutorial, learn, getting started, beginner, first time

---

## Quick Reference

### What Goes Here

Step-by-step learning materials that teach through practice:
- Getting started guides
- Feature walkthroughs
- Concept introductions
- Hands-on exercises

### Characteristics

- **Learning-oriented** - Teaches concepts
- **Safe environment** - Practice without risk
- **Step-by-step** - Clear progression
- **Beginner-friendly** - Assumes little knowledge
- **Explanatory** - Why, not just how

---

## When to Create Tutorials

**Create tutorial when:**
- New major feature launched
- Onboarding new developers
- Teaching complex concepts
- Users ask "how do I get started with X?"
- Introducing new patterns/tools

**Don't create tutorial for:**
- Simple one-step tasks (use how-to)
- Looking up specs (use reference)
- Explaining why (use explanation)

---

## Tutorial Structure

### Required Sections

**1. Introduction**
- What you'll learn (outcomes)
- Time estimate
- Prerequisites
- Who this is for

**2. Steps** (numbered, sequential)
- Clear goal for each step
- Explanation of what's happening
- Code examples
- Expected output
- Common issues

**3. Summary**
- What was learned
- Next steps (links to how-tos, references)

**4. Troubleshooting**
- Common problems and solutions

---

## Writing Good Tutorials

### Do

✅ **Explain concepts along the way**
```markdown
## Step 2: Create Your First Repository

Repositories handle database access using Prisma. They provide a clean
interface between your business logic and data storage.

Let's create a simple repository:
```

✅ **Show expected output**
```markdown
Run the test:
```bash
$ pnpm test member-repository.test.ts
```

**Expected output:**
```
✓ should create member with valid data (45ms)
✓ should return null when member not found (12ms)
```
```

✅ **Build confidence**
```markdown
Great! You've successfully created your first repository. This pattern
will be used throughout the application.
```

### Don't

❌ **Assume too much knowledge**
```markdown
Now inject the DI container into the factory pattern...
```

❌ **Skip explanations**
```markdown
Step 1: Run this command
Step 2: Run that command
[No explanation of what's happening]
```

❌ **Be too concise**
```markdown
Create repo. Done.
```

---

## File Naming

**Pattern:** `[topic].md` or `[descriptive-title].md`

**Examples:**
- `getting-started.md` - First tutorial
- `first-repository.md` - Building first repository
- `testing-basics.md` - Introduction to testing
- `authentication-flow.md` - Understanding auth

**Type prefix not needed** - directory indicates it's a tutorial

---

## Related Documentation

**How-to guides:**
- [How-to CLAUDE.md](../howto/CLAUDE.md) - For task-oriented docs

**Reference:**
- [Reference CLAUDE.md](../reference/CLAUDE.md) - For specifications

**Templates:**
- [Tutorial Template](../../templates/tutorial.md)

---

**Last Updated:** 2026-01-19
