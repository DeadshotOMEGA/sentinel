# How-to Guides (AI-First Guide)

**Purpose:** Task-oriented practical solutions

**AI Context Priority:** high

**When to Load:** User asks "how do I...", solving specific task

**Triggers:** how-to, howto, how do i, task, steps, solve

---

## Quick Reference

### What Goes Here

Practical step-by-step solutions to specific tasks:
- Adding features
- Configuring systems
- Fixing problems
- Performing operations

### Characteristics

- **Task-oriented** - Solves specific problem
- **Minimal explanation** - Just enough to complete task
- **Assumes familiarity** - Not for beginners
- **Result-focused** - Get to solution quickly
- **Practical** - Real-world scenarios

---

## When to Create How-tos

**Create how-to when:**
- Users ask "how do I X?" repeatedly (3+ times)
- Common task needs documentation
- Process has multiple steps
- Task could be done wrong without guidance

**Don't create how-to for:**
- Teaching concepts (use tutorial)
- Listing specifications (use reference)
- Explaining why (use explanation)

---

## How-to Structure

### Required Sections

**1. Goal** (one sentence)
- What this accomplishes

**2. Prerequisites / Assumes**
- What user needs before starting
- Assumed knowledge/setup

**3. Steps** (numbered)
- Clear, actionable steps
- Code/command examples
- Minimal explanation

**4. Verification**
- How to confirm it worked
- Expected result

**5. Troubleshooting** (optional)
- Common issues

---

## Writing Good How-tos

### Do

✅ **Be direct and concise**
```markdown
# How to Add a Repository

**Goal:** Create a new data access repository

**Assumes:** Database schema exists, TypeScript configured

## Steps

1. Create file `src/repositories/your-repository.ts`
2. Extend BaseRepository
3. Add methods
4. Write integration tests

## Verification

```bash
$ pnpm test your-repository.test.ts
# All tests pass
```
```

✅ **Focus on the task**
```markdown
## Steps

1. **Install dependency**
   ```bash
   $ pnpm add dependency-name
   ```

2. **Configure in settings**
   ```typescript
   // config.ts
   export const config = { ... }
   ```

3. **Use in code**
   [Example]
```

✅ **Provide verification**
```markdown
## Verification

Run the health check:
```bash
$ curl http://localhost:3000/health
```

Should return: `{"status": "healthy"}`
```

### Don't

❌ **Teach concepts**
```markdown
# How to Add Repository

First, let's understand what repositories are and why we use them.
Repositories implement the Repository Pattern, which is a...
[Long explanation]
```

❌ **Skip verification**
```markdown
## Steps

1. Do this
2. Do that

Done! [No way to verify it worked]
```

❌ **Be vague**
```markdown
1. Configure the system
2. Set up the database
[No specific commands or code]
```

---

## File Naming

**Pattern:** `[task-verb-noun].md` or `[action].md`

**Examples:**
- `add-repository.md` - Adding repositories
- `write-tests.md` - Writing tests
- `deploy-production.md` - Production deployment
- `fix-migration-errors.md` - Fixing migrations

**Type prefix optional** - directory indicates how-to

**Can use prefix for clarity:** `howto-add-repository.md` if mixed with other types in domain directories

---

## Related Documentation

**Tutorials:**
- [Tutorials CLAUDE.md](../tutorials/CLAUDE.md) - For learning-oriented docs

**Reference:**
- [Reference CLAUDE.md](../reference/CLAUDE.md) - For looking up specs

**Templates:**
- [How-to Template](../../templates/howto.md)

---

**Last Updated:** 2026-01-19
