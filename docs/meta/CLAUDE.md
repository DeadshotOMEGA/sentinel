# Meta Documentation (AI-First Guide)

**Purpose:** Documentation about documentation (meta-level)

**AI Context Priority:** high

**When to Load:** User creating docs, asking about doc system, doc standards

**Triggers:** documentation, style guide, how to document, doc standards

---

## Quick Reference

### What Goes Here

Documentation about the documentation system itself:
- **[Style Guide](style-guide.md)** - Complete writing conventions (coming soon)
- **[AI-First Principles](ai-first-principles.md)** - AI optimization strategies (coming soon)
- **[Health Tracking](health-tracking.md)** - Doc monitoring system (coming soon)
- **[Diátaxis Guide](diataxis-guide.md)** - Classification guide (coming soon)

### Purpose

**Meta docs explain:**
- How to write documentation
- Why we organize docs this way
- How to maintain doc quality
- How AI should use documentation

---

## Meta Documents (Planned)

### style-guide.md

**Purpose:** Complete writing conventions

**Contents:**
- Diátaxis classification rules
- Frontmatter standards
- Markdown formatting
- Code block conventions
- Cross-referencing patterns
- File naming (complete)
- Review process
- Versioning and deprecation

**Status:** To be created in Phase 4

### ai-first-principles.md

**Purpose:** AI-optimized documentation strategies

**Contents:**
- Progressive disclosure patterns
- Token optimization strategies
- Context priority system
- Trigger keyword guidelines
- Loading strategy recommendations
- Metadata best practices

**Status:** To be created in Phase 4

### health-tracking.md

**Purpose:** Documentation health monitoring

**Contents:**
- Staleness calculation
- Health metrics definition
- Monitoring setup guide
- CI/CD integration
- Alert configuration
- Report interpretation

**Status:** To be created in Phase 4

### diataxis-guide.md

**Purpose:** Complete Diátaxis classification guide

**Contents:**
- Detailed type descriptions
- Edge case disambiguation
- Tutorial vs. how-to decision tree
- Reference vs. explanation decision tree
- Multi-type document splitting
- Classification examples

**Status:** To be created in Phase 4

---

## Why Meta Documentation?

### Self-Referential System

Good documentation systems document themselves:
- **How to use** the system (this directory)
- **Why** the system works this way (explanations)
- **Standards** to maintain quality (style guide)
- **Monitoring** to ensure health (tracking)

### For New Contributors

**When someone new joins:**
1. Read `docs/README.md` - Navigation
2. Read `docs/CLAUDE.md` - AI-first overview
3. Read `docs/meta/style-guide.md` - Writing standards
4. Read `docs/templates/CLAUDE.md` - Templates usage
5. Start writing documentation

---

## Meta vs. Root CLAUDE.md

### docs/CLAUDE.md (Root)

**Purpose:** Navigation and quick reference
**Audience:** AI and users needing to find docs
**Scope:** Entire documentation system
**Depth:** Overview level

### docs/meta/style-guide.md

**Purpose:** Complete writing standards
**Audience:** Documentation writers
**Scope:** Writing conventions
**Depth:** Comprehensive details

**Relationship:** Root CLAUDE.md points to meta/ for detailed standards

---

## Creating Meta Documentation

### When Meta Doc is Needed

**Create meta doc when:**
- Documentation process needs standardization
- Writers ask same questions repeatedly
- Quality inconsistency observed
- New patterns emerge
- AI loading strategies evolve

**Examples:**
- "How should I format code blocks?" → style-guide.md
- "How does AI load context?" → ai-first-principles.md
- "How do I know if docs are outdated?" → health-tracking.md

---

## Meta Doc Structure

### Typical Sections

**1. Purpose**
- What this document covers
- Who should read it

**2. Principles / Rules**
- Core standards
- Must-follow conventions

**3. Examples**
- Good examples
- Bad examples (anti-patterns)

**4. Rationale**
- Why these standards
- Trade-offs considered

**5. Tools / Automation**
- Scripts to enforce standards
- CI/CD integration

---

## Related Documentation

**Root navigation:**
- [Documentation System](../CLAUDE.md)
- [README](../README.md)

**Templates:**
- [Templates CLAUDE.md](../templates/CLAUDE.md)

**Complete plan:**
- [AI-First Documentation System Plan](../plans/active/ai-first-documentation-system.md)

---

## Implementation Status

**Phase 4 (Weeks 7-8):**
- [ ] Create `style-guide.md`
- [ ] Create `ai-first-principles.md`
- [ ] Create `health-tracking.md`
- [ ] Create `diataxis-guide.md`

**See:** [Backend Rebuild Plan - Phase 4](../plans/active/backend-rebuild-plan.md)

---

**Last Updated:** 2026-01-19
