# Markdown File Delegation

## Rule

**ALWAYS delegate markdown file operations to the `doc-orchestrator` agent. No exceptions.**

When you need to create, edit, or update any of these file types, spawn `doc-orchestrator` instead of handling directly:

| File Pattern                | Why Delegate                       |
| --------------------------- | ---------------------------------- |
| `.claude/agents/*.md`       | Requires writing-subagents spec    |
| `.claude/skills/*/SKILL.md` | Requires writing-skills spec       |
| `**/CLAUDE.md`              | Requires writing-claudemd patterns |
| `.claude/rules/*.md`        | Requires writing-rules format      |
| `.claude/commands/*.md`     | Requires writing-commands format   |
| `README.md`                 | Requires writing-readmes structure |
| `CHANGELOG.md`              | Requires changelog format          |
| `docs/**/*.md`              | Requires appropriate doc skill     |
| `**/investigation*.md`      | Requires investigation template    |
| `**/plan*.md`               | Requires plan template             |
| `**/requirements*.md`       | Requires requirements template     |

## How to Delegate

```
Task(
  subagent_type="doc-orchestrator",
  prompt="Create/update [file path]: [requirements]"
)
```

## Rationale

The `doc-orchestrator` agent:

- Loads the correct writing-\* skill automatically
- Uses validated templates
- Follows established patterns
- Runs validation scripts
- Ensures consistency across all documentation
