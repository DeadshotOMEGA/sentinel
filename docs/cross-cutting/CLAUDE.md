# Cross-Cutting Concerns Documentation (AI-First Guide)

**Purpose:** System-wide technical concerns and patterns

**AI Context Priority:** medium

**When to Load:** User working on infrastructure, system-wide features, patterns

---

## Quick Reference

### What's Here

System-wide technical documentation:
- **[Testing](testing/)** - Test strategy, patterns, coverage
- **[Deployment](deployment/)** - CI/CD, infrastructure, releases
- **[Monitoring](monitoring/)** - Logs, metrics, alerts, observability

### When to Use Cross-Cutting

**Use cross-cutting when:**
- Feature affects multiple domains
- Infrastructure/technical concern
- System-wide pattern or practice
- Not specific to one business area

**Use domains when:**
- Business-specific feature
- Single domain concern
- Domain-specific business logic

---

## Cross-Cutting Structure

### Organization

```
cross-cutting/[concern]/
├── CLAUDE.md                        # Concern guide
├── explanation-[topic].md           # Why/how patterns work
├── reference-[subject].md           # Specs, configurations
└── howto-[task].md                  # Practical implementation
```

### File Naming

**Use type prefix:**
- `explanation-integration-first.md`
- `reference-coverage-targets.md`
- `howto-write-repository-tests.md`

---

## Cross-Cutting Concerns

### Testing
**What:** Test strategy, patterns, tooling, coverage
**Scope:** All repositories, services, routes, E2E
**Key Principle:** Integration-first with Testcontainers
**See:** [Testing CLAUDE.md](testing/CLAUDE.md)

### Deployment
**What:** CI/CD, infrastructure, release process
**Scope:** Build, test, deploy, monitoring setup
**Key Tools:** GitHub Actions, Docker, pnpm
**See:** [Deployment CLAUDE.md](deployment/CLAUDE.md)

### Monitoring
**What:** Logging, metrics, alerts, observability
**Scope:** Winston logs, health checks, error tracking
**Key Features:** Correlation IDs, structured logging
**See:** [Monitoring CLAUDE.md](monitoring/CLAUDE.md)

---

## Cross-Cutting vs. Domain

### Examples

**✅ Cross-Cutting (Testing):**
- "How to write integration tests"
- "Repository testing patterns"
- "Coverage targets for all code"

**✅ Domain (Personnel):**
- "How member badge assignment works"
- "Member API endpoints"
- "Division hierarchy rules"

**Decision Rule:**
> If it applies to multiple domains → Cross-cutting
> If it's domain-specific logic → Domain

---

## Adding New Cross-Cutting Concerns

### When to Create

**Create new concern when:**
- Pattern used across multiple domains
- System-wide technical need
- Infrastructure component
- Architectural pattern

**Potential new concerns:**
- Security (auth patterns, encryption, auditing)
- Performance (caching, optimization, profiling)
- Data (migrations, backup, recovery)
- Integration (external APIs, webhooks)

### Setup Steps

1. Create directory: `docs/cross-cutting/[concern]/`
2. Create CLAUDE.md (copy from similar concern)
3. Add to this index
4. Update root README.md
5. Create initial docs (explanation, reference, how-to)

---

## Related Documentation

**Domains:**
- [Authentication](../domains/authentication/CLAUDE.md)
- [Personnel](../domains/personnel/CLAUDE.md)
- [Check-in](../domains/checkin/CLAUDE.md)
- [Events](../domains/events/CLAUDE.md)

**Guides:**
- [Explanation Guides](../guides/explanation/CLAUDE.md)
- [How-to Guides](../guides/howto/CLAUDE.md)

**Root:**
- [Documentation System](../CLAUDE.md)

---

**Last Updated:** 2026-01-19
