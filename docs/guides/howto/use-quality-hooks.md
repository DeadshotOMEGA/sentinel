---
type: howto
title: Use Quality Check Hooks in Claude Code
status: published
created: 2026-01-22
last_updated: 2026-01-22
task: Run automated quality checks during AI-assisted development
context: Claude Code PostToolUse hooks
difficulty: beginner
estimated_time: 5min
priority: high
context_load: on-demand
triggers: ["quality hooks", "claude code hooks", "prettier", "eslint"]
token_budget: 800
---

# How to Use Quality Check Hooks in Claude Code

## Goal

Automatically validate TypeScript code quality during AI-assisted development with real-time feedback and auto-fixing.

## Prerequisites

- Sentinel project set up locally
- Claude Code installed
- Node.js and pnpm installed
- ESLint and Prettier configured (already done in Sentinel)

## Steps

### 1. Understanding the Hook

The quality check hook runs automatically after every `Write`, `Edit`, or `MultiEdit` operation in Claude Code. It:

- **Checks TypeScript compilation** for type errors
- **Runs ESLint** and auto-fixes violations
- **Runs Prettier** and auto-formats code
- **Detects common patterns** (`as any`, console, debugger, TODOs)
- **Blocks edits** with quality issues (exit code 2)

### 2. Hook Behavior

**When You Edit a File:**

1. Claude Code writes/edits the file
2. Hook runs automatically (you see output in terminal)
3. Auto-fixes apply (ESLint, Prettier)
4. If errors found: edit is blocked, errors shown
5. If checks pass: edit completes successfully

**Example Output:**

```
Running quality checks on: apps/backend/src/services/example.ts
✅ Prettier auto-fixed formatting
✅ TypeScript check passed
✅ ESLint check passed
✅ All quality checks passed!
```

### 3. Handling Errors

**If Errors Detected:**

```
❌ ESLint Errors:
  example.ts:10:5 - Unexpected any. Specify a different type.

❌ Code Issues:
  Line 15: Debugger statement found - remove before committing

❌ Quality checks failed - fix errors before proceeding
```

**Actions:**
1. Review the errors
2. Fix the issues manually or ask Claude to fix them
3. Save again - hook re-runs automatically

### 4. Customizing Rules

**Edit `.claude/hooks/quality-check/hook-config.json`:**

```json
{
  "rules": {
    "console": {
      "severity": "error",
      "allowIn": [
        "apps/backend/src/routes/dev.ts",
        "**/*.test.ts"
      ]
    }
  }
}
```

**Add paths to `allowIn` to permit console statements in specific files.**

### 5. Environment Variables

**Disable Specific Checks:**

```bash
# Disable Prettier temporarily
export CLAUDE_HOOKS_PRETTIER=false

# Disable auto-fix
export CLAUDE_HOOKS_ESLINT_AUTOFIX=false
export CLAUDE_HOOKS_PRETTIER_AUTOFIX=false

# Enable debug output
export CLAUDE_HOOKS_DEBUG=true
```

**Add to `.env.local` for persistent settings.**

### 6. Troubleshooting

**Hook Not Running:**
- Check `.claude/settings.json` has PostToolUse hook configured
- Verify hook file is executable: `chmod +x .claude/hooks/quality-check/quality-check.js`
- Check Claude Code permissions include `.claude/hooks` directory

**Too Many Errors:**
- Fix errors in batches
- Temporarily disable specific checks with environment variables
- Ask Claude to fix errors in smaller chunks

**Performance Issues:**
- Hook caches TypeScript configs for speed
- Large files (>10MB) are skipped automatically
- Checks run in parallel for efficiency

## Tips

1. **Let Auto-Fix Work**: Prettier and ESLint auto-fix most formatting issues
2. **Fix TypeScript Errors First**: They block the most functionality
3. **Use Debug Mode**: Set `CLAUDE_HOOKS_DEBUG=true` to see detailed output
4. **Configure Exclusions**: Add paths to `excludedPaths` in hook-config.json

## Common Patterns

**Allowing Console in Test Files:**

Already configured! Test files (`*.test.ts`, `*.spec.ts`) allow console statements.

**Disabling Hook Temporarily:**

```bash
# In terminal
export CLAUDE_HOOKS_TYPESCRIPT=false
export CLAUDE_HOOKS_ESLINT=false
export CLAUDE_HOOKS_PRETTIER=false
```

**Viewing Hook Configuration:**

```bash
cat .claude/hooks/quality-check/hook-config.json | jq .
```

## What Gets Checked

| Check | Auto-Fix | Blocks Edit |
|-------|----------|-------------|
| TypeScript compilation errors | No | Yes |
| ESLint violations | Yes | Yes |
| Prettier formatting | Yes | No (auto-fixed) |
| `as any` type assertions | No | Warning only |
| Console statements (outside tests) | No | Yes |
| Debugger statements | No | Yes |
| TODO comments | No | Info only |

## Next Steps

- Review [Research Document](../../research/2026-01-22-claude-code-quality-hooks.md) for implementation details
- Customize rules in `hook-config.json` for your workflow
- Add project-specific patterns to custom checks

## Related

- [Architecture Reference](../reference/architecture.md) - Sentinel tech stack
- [Testing Guide](../../cross-cutting/testing/CLAUDE.md) - Testing standards
- [ESLint Configuration](../../../eslint.config.js) - ESLint rules
- [Prettier Configuration](../../../.prettierrc) - Formatting rules

---

**Last Updated**: 2026-01-22
**Status**: Published
**Feedback**: Report issues to project maintainer
