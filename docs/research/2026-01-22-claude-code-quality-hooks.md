---
type: research
title: Implementing TypeScript Quality Hooks in Sentinel
status: draft
created: 2026-01-22
last_updated: 2026-01-22
author: Claude
purpose: Analyze bartolli/claude-code-typescript-hooks repository and determine implementation strategy for Sentinel
outcome: Recommendation to implement adapted quality hooks with Prettier integration
priority: high
context_load: on-demand
triggers: ["quality hooks", "claude code hooks", "typescript validation", "prettier"]
token_budget: 3000
---

# Implementing TypeScript Quality Hooks in Sentinel

## Executive Summary

**Repository Analyzed**: [bartolli/claude-code-typescript-hooks](https://github.com/bartolli/claude-code-typescript-hooks)

**Recommendation**: Implement adapted Node.js TypeScript quality hooks with Prettier integration for real-time code quality validation during AI-assisted development.

**Key Benefits**:
- Catch TypeScript errors immediately in Claude Code (before commit)
- Enforce consistent formatting with Prettier auto-fix
- Reduce feedback loop from minutes (CI/CD) to seconds (inline)
- Prevent common mistakes (`any` types, missing error handling)
- Maintain quality parity between manual and AI-generated code

---

## Current State Analysis

### Sentinel's Existing Setup

**✅ Already Configured:**
- **ESLint 9** with flat config (`eslint.config.js`)
  - TypeScript ESLint plugin with recommended rules
  - Unused vars rule configured (`_` prefix ignored)
  - `no-explicit-any` set to error
  - Prettier integration (conflicts disabled)

- **Prettier** installed but **NO config file**
  - Integrated via `eslint-config-prettier`
  - Used in lint-staged (pre-commit)
  - No standalone `.prettierrc` or `prettier.config.js`

- **Lint-staged + Husky**
  - Pre-commit hooks run ESLint + Prettier
  - Configured in `package.json` lint-staged section

- **Claude Code Hooks**
  - One existing hook: `claudemd-linter.js`
  - Validates CLAUDE.md file structure
  - Uses ToolCall hook type (runs on Write/Edit)

**❌ Missing:**
- Real-time TypeScript compilation checks in Claude Code
- ESLint validation during AI edits
- Prettier auto-formatting during AI edits
- Performance-optimized TypeScript config caching
- Common pattern detection (console usage, `as any`)
- Node.js specific validations

---

## bartolli Repository Analysis

### Architecture

**Hook Types Provided:**
1. `react-app` - React, Next.js, Vite projects
2. `vscode-extension` - VS Code extension development
3. `node-typescript` - Node.js TypeScript projects (**most relevant for Sentinel**)

**Core Components:**

1. **Quality Check Script** (`quality-check.js`)
   - Main validation orchestrator
   - Runs TypeScript, ESLint, Prettier checks in parallel
   - Supports auto-fix for ESLint and Prettier
   - Custom pattern detection

2. **TypeScript Config Cache System**
   - SHA256 hashing of tsconfig files
   - File-to-config mappings with glob patterns
   - 95%+ performance improvement (< 5ms vs 100-200ms)
   - Handles multiple tsconfig files (monorepo-ready)

3. **Hook Configuration** (`hook-config.json`)
   - Toggle individual checks (TypeScript, ESLint, Prettier)
   - Configure auto-fix behavior
   - Define custom rules and severity levels
   - Path-based allow/deny lists

### Quality Checks Performed

| Check | Purpose | Auto-Fix |
|-------|---------|----------|
| **TypeScript** | Compilation errors, type safety | No |
| **ESLint** | Code quality, best practices | Yes |
| **Prettier** | Code formatting consistency | Yes |
| **Common Patterns** | `as any`, console usage, TODOs | No (warn) |
| **Node.js Patterns** | process.exit, error handlers, streams | No (warn) |

### Exit Code Strategy

- **Exit 0**: All checks pass (silent in Claude Code)
- **Exit 1**: Tool errors (e.g., ESLint not installed)
- **Exit 2**: Quality issues found (blocks edit, shows errors)

### Configuration Options

**Environment Variables:**
```bash
CLAUDE_HOOKS_PRETTIER_ENABLED=false  # Disable Prettier
CLAUDE_HOOKS_DEBUG=true              # Verbose output
CLAUDE_HOOKS_SHOW_DEPENDENCY_ERRORS=true  # Show dep errors
CLAUDE_HOOKS_ESLINT_AUTOFIX=true     # Auto-fix ESLint
CLAUDE_HOOKS_PRETTIER_AUTOFIX=true   # Auto-fix Prettier
```

**hook-config.json Example:**
```json
{
  "projectType": "node-typescript",
  "checks": {
    "typescript": { "enabled": true },
    "eslint": { "enabled": true, "autoFix": true },
    "prettier": { "enabled": true, "autoFix": true }
  },
  "rules": {
    "console": {
      "severity": "off",
      "allowIn": ["src/cli.ts", "src/bin/**"]
    }
  }
}
```

---

## Gap Analysis

### What Sentinel Lacks

1. **Real-time Validation**
   - No TypeScript checks during Claude Code edits
   - ESLint/Prettier only run on git commit (delayed feedback)

2. **Auto-Fix Integration**
   - ESLint auto-fix not available in Claude Code workflow
   - Prettier formatting not automatic during AI edits

3. **Performance Optimization**
   - No caching mechanism for TypeScript configs
   - Full revalidation on every check (slow for monorepo)

4. **Pattern Detection**
   - No enforcement of code patterns during AI editing
   - Console usage not regulated by context
   - `as any` usage not blocked in real-time

5. **Monorepo Awareness**
   - No file-to-tsconfig mapping
   - No per-package quality rules

---

## Implementation Recommendations

### Recommended Approach: **Adapt bartolli's node-typescript Hook**

**Rationale:**
- Proven, battle-tested solution (156 GitHub stars)
- Comprehensive check coverage
- Performance-optimized with caching
- Extensible architecture
- MIT licensed (can modify freely)

**Customizations Required:**
1. Monorepo support (multiple tsconfig files)
2. Sentinel-specific rules (Prisma, ts-rest patterns)
3. Integration with existing ESLint/Prettier configs
4. Console usage rules (allow in dev routes, deny in services)

### Alternative: Build Custom Hook

**Pros:**
- Tailored exactly to Sentinel's needs
- Full control over implementation
- No external dependencies

**Cons:**
- Development time (40+ hours estimated)
- Reinventing proven solutions
- Ongoing maintenance burden

**Verdict:** Not recommended - leverage existing solution

---

## Implementation Plan

### Phase 1: Setup (1 hour)

1. **Download bartolli's node-typescript hook**
   ```bash
   mkdir -p .claude/hooks/quality-check
   # Download quality-check.js and related files
   ```

2. **Create hook configuration**
   ```bash
   # Create .claude/hooks/quality-check/hook-config.json
   # Adapt for Sentinel's structure
   ```

3. **Test basic functionality**
   ```bash
   node .claude/hooks/quality-check/quality-check.js test-file.ts
   ```

### Phase 2: Monorepo Configuration (2 hours)

1. **Configure TypeScript paths**
   - Map apps/backend/tsconfig.json
   - Map packages/*/tsconfig.json
   - Set up config priority (package > app > root)

2. **Adapt ESLint integration**
   - Use Sentinel's `eslint.config.js`
   - Respect monorepo workspace structure
   - Enable auto-fix by default

3. **Configure Prettier**
   - Create `.prettierrc` (currently missing!)
   - Define Sentinel's formatting rules
   - Enable auto-fix for AI edits

### Phase 3: Claude Code Integration (30 min)

1. **Update `.claude/settings.json`**
   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Write|Edit|MultiEdit",
           "hooks": [
             {
               "type": "command",
               "command": "node .claude/hooks/quality-check/quality-check.js"
             }
           ]
         }
       ],
       "ToolCall": [
         {
           "name": "claudemd-linter",
           "description": "Validate CLAUDE.md files",
           "command": "node .claude/hooks/claudemd-linter.js {file_path}",
           "filter": {
             "tools": ["Write", "Edit"],
             "filePattern": "**/CLAUDE.md"
           }
         }
       ]
     }
   }
   ```

2. **Test with sample edits**
   - Edit a TypeScript file with error
   - Verify hook blocks invalid code
   - Verify auto-fix works for formatting

### Phase 4: Sentinel-Specific Customization (3 hours)

1. **Add custom rules**
   - Detect Prisma `prisma.$` global usage (prefer injection)
   - Enforce ts-rest response format (`status: X as const`)
   - Warn on missing better-auth types
   - Block `any` types (already in ESLint)

2. **Configure console usage**
   ```json
   "rules": {
     "console": {
       "severity": "error",
       "allowIn": [
         "apps/backend/src/routes/dev.ts",
         "scripts/**",
         "*.test.ts"
       ]
     }
   }
   ```

3. **Add test file suggestions**
   - Detect when route/service edited
   - Suggest running related tests
   - Link to test files if they exist

4. **Performance tuning**
   - Enable TypeScript config caching
   - Exclude node_modules, dist, coverage
   - Optimize glob patterns

---

## Prettier Integration - **Recommended: Yes**

### Why Add Prettier Now?

**Current Situation:**
- Prettier is installed and used in lint-staged
- **No `.prettierrc` file exists**
- Formatting rules undefined (using Prettier defaults)
- Inconsistent formatting possible across team

**Benefits of Adding Prettier to Quality Hook:**

1. **Immediate Feedback**
   - AI edits get auto-formatted instantly
   - No "format later" accumulation
   - Consistent formatting across manual and AI code

2. **Reduced Cognitive Load**
   - Don't think about formatting during development
   - Focus on logic, let tooling handle style

3. **Git Diff Clarity**
   - Formatting changes separated from logic changes
   - Easier code review
   - Cleaner commit history

4. **Team Consistency**
   - Everyone follows same formatting rules
   - No formatting debates
   - IDE-agnostic (works in Claude Code, VS Code, etc.)

### Recommended Prettier Configuration

Create `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Rationale for each option:**
- `semi: false` - Modern JavaScript style (optional semicolons)
- `singleQuote: true` - Consistent with TypeScript convention
- `trailingComma: "es5"` - Better git diffs, supported everywhere
- `printWidth: 100` - Readable on modern displays
- `tabWidth: 2` - Standard for TypeScript/JavaScript
- `arrowParens: "always"` - Explicit, consistent
- `endOfLine: "lf"` - Unix style (WSL2 compatible)

### Implementation Steps for Prettier

1. **Create `.prettierrc`**
   ```bash
   echo '{
     "semi": false,
     "singleQuote": true,
     "trailingComma": "es5",
     "printWidth": 100,
     "tabWidth": 2,
     "useTabs": false,
     "arrowParens": "always",
     "endOfLine": "lf"
   }' > .prettierrc
   ```

2. **Create `.prettierignore`**
   ```
   node_modules
   dist
   build
   coverage
   .next
   generated
   *.d.ts
   *.js.map
   pnpm-lock.yaml
   ```

3. **Enable in quality hook**
   ```json
   {
     "checks": {
       "prettier": {
         "enabled": true,
         "autoFix": true,
         "config": ".prettierrc"
       }
     }
   }
   ```

4. **Format existing codebase** (one-time)
   ```bash
   pnpm format  # Uses existing script
   git add -A
   git commit -m "chore: apply Prettier formatting"
   ```

---

## Configuration Examples

### Complete `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/quality-check/quality-check.js",
            "continueOnError": false
          }
        ]
      }
    ],
    "ToolCall": [
      {
        "name": "claudemd-linter",
        "description": "Validate CLAUDE.md files for structure and style compliance",
        "command": "node .claude/hooks/claudemd-linter.js {file_path}",
        "filter": {
          "tools": ["Write", "Edit"],
          "filePattern": "**/CLAUDE.md"
        }
      }
    ]
  }
}
```

### Complete `hook-config.json`

```json
{
  "version": "1.0.0",
  "projectType": "node-typescript-monorepo",
  "checks": {
    "typescript": {
      "enabled": true,
      "showDependencyErrors": false,
      "tsconfigPaths": [
        "apps/backend/tsconfig.json",
        "packages/*/tsconfig.json"
      ]
    },
    "eslint": {
      "enabled": true,
      "autoFix": true,
      "configPath": "eslint.config.js"
    },
    "prettier": {
      "enabled": true,
      "autoFix": true,
      "configPath": ".prettierrc"
    }
  },
  "rules": {
    "console": {
      "severity": "error",
      "allowIn": [
        "apps/backend/src/routes/dev.ts",
        "scripts/**/*.ts",
        "**/*.test.ts",
        "**/*.spec.ts"
      ]
    },
    "typeAssertions": {
      "severity": "warning",
      "blockPatterns": ["as any"]
    },
    "debugger": {
      "severity": "error"
    },
    "comments": {
      "severity": "info",
      "patterns": ["TODO", "FIXME", "HACK"]
    }
  },
  "excludedPaths": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    ".next/**",
    "generated/**",
    "**/*.d.ts"
  ],
  "silentAutofix": true,
  "debug": false
}
```

---

## Benefits for Sentinel

### Development Velocity
- **Immediate error detection** (seconds vs minutes)
- **Auto-fix trivial issues** (formatting, simple lint errors)
- **Reduced context switching** (errors shown inline, not in CI logs)

### Code Quality
- **Prevent regressions** during AI-assisted refactoring
- **Enforce type safety** (`any` types caught immediately)
- **Consistent formatting** across entire codebase

### Team Productivity
- **Reduced review cycles** (formatting already correct)
- **Fewer failed CI builds** (caught before commit)
- **Onboarding consistency** (same rules for everyone)

### AI Development
- **Quality parity** between AI and manual code
- **Teach AI patterns** (learns from corrections)
- **Faster iteration** (fix and retry immediately)

---

## Potential Challenges

### 1. Performance Impact
**Issue**: Hook runs on every edit, could slow Claude Code
**Mitigation**:
- TypeScript config caching (95% faster)
- Exclude large files (> 10,000 lines)
- Run checks in parallel
- Skip non-TS/JS files early

### 2. False Positives
**Issue**: Valid code flagged incorrectly
**Mitigation**:
- Tune rules in `hook-config.json`
- Use environment variables for quick toggles
- Add path-based exceptions
- Document expected patterns in CLAUDE.md

### 3. Monorepo Complexity
**Issue**: Multiple tsconfig files, different rules per package
**Mitigation**:
- File-to-config mapping with priorities
- Package-specific rule overrides
- Clear documentation of package boundaries

### 4. Hook Conflicts
**Issue**: Overlap with Husky pre-commit hooks
**Mitigation**:
- Pre-commit hooks as safety net (not primary validation)
- Claude Code hooks for real-time feedback
- Both use same configs (no duplication)

### 5. Learning Curve
**Issue**: Team needs to understand hook behavior
**Mitigation**:
- Clear error messages
- Documentation in docs/guides/howto/
- Environment variables for debugging
- Gradual rollout (optional at first)

---

## Alternatives Considered

### Option 1: Rely Solely on Pre-commit Hooks
**Pros**: Already set up, works
**Cons**: Delayed feedback, context switching, slower iteration

**Verdict**: ❌ Insufficient for AI-assisted development

### Option 2: Use Claude Code Built-in Validation
**Pros**: No setup required
**Cons**: Limited (no TypeScript, ESLint, Prettier)

**Verdict**: ❌ Not comprehensive enough

### Option 3: Manual Review Process
**Pros**: Human judgment, flexible
**Cons**: Error-prone, slow, inconsistent

**Verdict**: ❌ Doesn't scale

### Option 4: Custom Hook from Scratch
**Pros**: Tailored exactly to Sentinel
**Cons**: 40+ hours development, ongoing maintenance

**Verdict**: ❌ Not worth the investment

### **Recommended: Adapt bartolli's Hook**
**Pros**: Proven, comprehensive, MIT licensed, fast
**Cons**: Requires customization for monorepo

**Verdict**: ✅ Best ROI

---

## Next Steps

### Immediate (This Session)
1. ✅ Research completed
2. ⏭️ Create `.prettierrc` configuration
3. ⏭️ Format codebase with Prettier
4. ⏭️ Download and adapt bartolli's hook

### Short Term (Next Session)
5. Configure hook for Sentinel's monorepo
6. Integrate with `.claude/settings.json`
7. Test with sample edits
8. Document in docs/guides/howto/

### Medium Term (This Week)
9. Add Sentinel-specific rules
10. Performance tuning and optimization
11. Team rollout and training
12. Monitor and iterate

---

## Conclusion

Implementing quality hooks from bartolli's repository with Prettier integration will **significantly improve** Sentinel's development workflow:

- **Real-time feedback** during AI-assisted coding
- **Automatic formatting** with Prettier (no manual intervention)
- **Type safety enforcement** preventing `any` types and errors
- **Consistent code quality** across manual and AI contributions

**Recommendation**: **Proceed with implementation immediately**

**Estimated Time**: 6-8 hours total
**Expected ROI**: 10-20 hours saved per week in code review and debugging

**Priority**: High - enhances AI development workflow

---

## References

- [bartolli/claude-code-typescript-hooks](https://github.com/bartolli/claude-code-typescript-hooks)
- [Claude Code Hooks Documentation](https://docs.anthropic.com/claude-code/hooks)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [TypeScript Compiler Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)

---

**Last Updated**: 2026-01-22
**Status**: Ready for implementation
**Next Action**: Create `.prettierrc` and begin hook adaptation
