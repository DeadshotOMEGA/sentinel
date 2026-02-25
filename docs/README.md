# Sentinel Documentation

**Welcome to the Sentinel RFID Attendance Tracking System documentation.**

This documentation system uses AI-first organization principles with the Diátaxis framework for clear, discoverable content.

---

## Quick Navigation

### 🏗️ Getting Started

- [System Overview](CLAUDE.md) - How this documentation works (AI-first)
- [Style Guide](meta/style-guide.md) - Writing conventions
- [Templates](templates/CLAUDE.md) - Document templates

### 📚 Documentation by Type

#### [Guides](guides/) - Diátaxis-organized documentation

- **[Tutorials](guides/tutorials/)** - Learning-oriented, step-by-step
- **[How-to Guides](guides/howto/)** - Task-oriented solutions
- **[Reference](guides/reference/)** - Complete specifications
- **[Explanation](guides/explanation/)** - Conceptual understanding

#### [Domains](domains/) - Business domain documentation

- **[Authentication](domains/authentication/)** - Auth, sessions, API keys
- **[Personnel](domains/personnel/)** - Members, divisions, ranks
- **[Check-in](domains/checkin/)** - Badge scanning, presence tracking
- **[Events](domains/events/)** - Temporary access, visitors

#### [Cross-Cutting](cross-cutting/) - System-wide concerns

- **[Testing](cross-cutting/testing/)** - Test strategy, patterns
- **[Deployment](cross-cutting/deployment/)** - CI/CD, infrastructure
- **[Monitoring](cross-cutting/monitoring/)** - Logs, metrics, alerts

### 🎯 Decisions & Planning

- **[ADRs](decisions/adr/)** - Architecture Decision Records
- **[RFCs](decisions/rfc/)** - Request for Comments
- **[Plans](plans/)** - Implementation plans ([active](plans/active/) | [completed](plans/completed/))
- **[Research](research/)** - Investigation documents
- **[Sessions](sessions/)** - Session reports

### 📖 Resources

- **[Concepts](concepts/)** - Atomic concept definitions
- **[Templates](templates/)** - Document templates
- **[Meta](meta/)** - Documentation about documentation

---

## Documentation Philosophy

### AI-First Principles

This documentation is optimized for both human readers and AI systems like Claude Code:

1. **Progressive Disclosure** - Information in layers (quick → detailed → complete)
2. **Atomic Concepts** - One concept per document, densely linked
3. **Rich Metadata** - Frontmatter with AI context hints
4. **Clear Structure** - Diátaxis classification, consistent naming

### Diátaxis Framework

Every document fits exactly one category:

| Type            | Purpose                | Audience        | Example                 |
| --------------- | ---------------------- | --------------- | ----------------------- |
| **Tutorial**    | Learning-oriented      | Beginners       | Getting Started Guide   |
| **How-to**      | Task-oriented          | Practitioners   | How to Add a Repository |
| **Reference**   | Information-oriented   | Lookup          | API Endpoints Reference |
| **Explanation** | Understanding-oriented | Decision-makers | Testing Philosophy      |

---

## Finding Documentation

### By Task

**I want to learn something new:**
→ [Tutorials](guides/tutorials/)

**I need to accomplish a specific task:**
→ [How-to Guides](guides/howto/)

**I need to look up specifications:**
→ [Reference](guides/reference/)

**I want to understand why something works this way:**
→ [Explanation](guides/explanation/)

### By Domain

**Working on authentication:**
→ [Authentication Domain](domains/authentication/)

**Working on member management:**
→ [Personnel Domain](domains/personnel/)

**Working on badge scanning:**
→ [Check-in Domain](domains/checkin/)

**Working on visitor/event access:**
→ [Events Domain](domains/events/)

### By Concern

**Testing:**
→ [Testing Cross-Cutting](cross-cutting/testing/)

**Deployment:**
→ [Deployment Cross-Cutting](cross-cutting/deployment/)

**Monitoring:**
→ [Monitoring Cross-Cutting](cross-cutting/monitoring/)

---

## Quick Links

### For Developers

- [Backend Rebuild Plan](plans/active/backend-rebuild-plan.md)
- [Testing Strategy](cross-cutting/testing/explanation-integration-first.md) (coming soon)
- [Repository Pattern](concepts/repository-pattern.md) (coming soon)
- [Port Allocation Reference](guides/reference/port-allocation.md)
- [API Reference](guides/reference/) (coming soon)

### For Documentation Writers

- [Style Guide](meta/style-guide.md) (coming soon)
- [AI-First Principles](meta/ai-first-principles.md) (coming soon)
- [Diátaxis Guide](meta/diataxis-guide.md) (coming soon)
- [Templates](templates/)

### For Project Managers

- [Active Plans](plans/active/)
- [Architecture Decisions](decisions/adr/)
- [RFCs](decisions/rfc/)
- [Project Architecture](guides/explanation/) (coming soon)

---

## Contributing

When creating new documentation:

1. **Choose the right location** - See [CLAUDE.md](CLAUDE.md) for directory guide
2. **Use the correct template** - See [templates/](templates/)
3. **Follow naming conventions** - See [Style Guide](meta/style-guide.md)
4. **Add frontmatter** - Include AI metadata for better context loading
5. **Cross-reference** - Link to related documents

---

## Documentation Health

- **Coverage:** Documents across all major systems
- **Freshness:** Regular review and updates
- **Quality:** Tested examples, validated links

See [Health Tracking](meta/health-tracking.md) for monitoring details (coming soon).

---

## Need Help?

- **Can't find what you're looking for?** Check [CLAUDE.md](CLAUDE.md) for navigation tips
- **Unclear documentation?** File an issue or propose an improvement
- **Want to contribute?** See templates and style guide

---

**Last Updated:** 2026-01-19
