# Creating Agents & Skills

Include tier metadata in frontmatter for workflow orchestration:

```yaml
---
name: my-agent
description: What it does
tiers: [2, 5]     # Can belong to multiple tiers (or use tier: 2 for single)
category: expertise
capabilities: [what, it, does]
triggers: [keywords, that, match, requirements]
parallel: true    # Can run alongside other agents in same tier
---
```

## Tier Definitions

| Tier | Name | Purpose | Examples |
|------|------|---------|----------|
| 0 | Git Setup | Branch creation, git flow | git-flow-manager |
| 1 | Explore & Research | Investigation, research | explorer, research-specialist |
| 2 | Domain Expertise | Specialist consultation | database-admin, security-auditor |
| 3 | Planning | Implementation planning | implementation-planner |
| 4 | Implementation | Code changes | programmer, junior-engineer |
| 5 | Validation | Testing, review | test-engineer, code-reviewer |

**Multi-tier agents**: Use `tiers: [2, 5]` for agents that serve multiple purposes.

After creating/modifying agents, run `/sync-registry` to update the workflow orchestrator.
