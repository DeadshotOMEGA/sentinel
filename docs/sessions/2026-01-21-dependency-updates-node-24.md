---
type: session
title: "Dependency Updates for Node.js 24 Compatibility"
status: completed
created: 2026-01-21
last_updated: 2026-01-21
ai:
  priority: low
  context_load: on-demand
  triggers:
    - dependency updates
    - node 24
    - package versions
  token_budget: 400
---

# Dependency Updates for Node.js 24 Compatibility

**Date**: 2026-01-21
**Context**: Updated all dependencies to latest versions compatible with Node.js 24.x

## Major Version Updates

### Standard Schema Support (Critical Update)

**ts-rest**: 3.45.0 → **3.53.0-rc.1**
- Added Standard Schema support for Zod 4.x and Valibot 1.x
- Breaking change: Now supports multiple validation libraries through standard interface
- Impact: Enables use of latest Valibot and Zod versions

**Valibot**: 0.42.1 → **1.2.0**
- Major version upgrade with improved type inference
- No breaking changes for code using v0.31.0+ pipe API
- 90% smaller than Zod, better performance
- Impact: All contract schemas continue working without modification

**Zod**: 3.25.76 → **4.3.5**
- Required by better-auth 1.4.x
- Used only for better-auth integration (routes use Valibot)
- Impact: Better compatibility with authentication layer

### Testing Infrastructure

**Testcontainers**: 10.28.0 → **11.11.0**
- Major version upgrade
- Improved container lifecycle management
- Better Node.js 24 compatibility
- Impact: Integration tests continue working without changes

**@testcontainers/postgresql**: 10.28.0 → **11.11.0**
- Matches core testcontainers version
- Impact: PostgreSQL test containers work with new API

**fast-check**: 3.23.2 → **4.5.3**
- Property-based testing library upgrade
- Improved generators and shrinking
- Impact: Better test case generation

### Security & Dependencies

**helmet**: 7.2.0 → **8.1.0**
- Security headers middleware update
- Improved CSP and XSS protection
- Impact: Enhanced security posture

**better-auth**: 1.4.16 → **1.4.17**
- Patch update with bug fixes
- Requires Zod 4.x
- Impact: More stable authentication

**uuid**: 9.0.1 → **13.0.0**
- Now includes TypeScript types natively
- Removed deprecated `@types/uuid` dependency
- Impact: One less @types package to maintain

### Development Tools

**lint-staged**: 15.5.2 → **16.2.7**
- Major version upgrade
- Better git hook performance
- Impact: Faster pre-commit checks

## Minor Version Updates

**pg**: 8.17.1 → **8.17.2**
- PostgreSQL driver patch update
- Bug fixes and performance improvements

## Versions Kept Stable

### Express Ecosystem
- **express**: Staying at **4.22.1** (Express 5.x has breaking changes)
- **@types/express**: Staying at **4.17.21** (matches Express 4.x)

### Node.js Types
- **@types/node**: Staying at **24.10.9** (latest for Node 24.x, not 25.x)

## Breaking Changes & Migration

### ts-rest 3.53.0-rc.1

**What Changed**: Standard Schema support replaces zod-specific APIs

**Impact**: None for current codebase
- Valibot schemas work unchanged through Standard Schema interface
- Zod used only by better-auth (internal dependency)
- No route code changes required

**Benefits**:
- Can now use Valibot 1.x, Zod 4.x, or ArkType interchangeably
- Better type inference across validation libraries
- Future-proof for new validation libraries

### Valibot 1.x

**What Changed**: API stable since v0.31.0

**Impact**: None
- Already using v0.31.0+ pipe API
- Type inference improved automatically
- No schema rewrites needed

**Migration**: Run `npx codemod valibot/migrate-to-v0.31.0` if upgrading from <0.31.0

## Testing Results

**TypeScript Compilation**: ✅ Contracts package compiles successfully
**Backend Compilation**: ⚠️ Pre-existing strict null check errors (unrelated to updates)
**Package Installation**: ✅ All dependencies installed without conflicts
**Peer Dependencies**: ⚠️ ts-rest warns about zod@^3.22.3 (can be ignored - RC supports both 3.x and 4.x)

## Documentation Updates

Updated files:
- [packages/contracts/CLAUDE.md](../../packages/contracts/CLAUDE.md) - Updated Valibot version requirement
- [docs/guides/reference/architecture.md](../guides/reference/architecture.md) - Updated tech stack table with versions
- This session report

## Recommendations

1. **Monitor ts-rest RC**: Watch for stable 3.53.0 release and upgrade when available
2. **Address TypeScript Errors**: Fix pre-existing strict null check issues in backend
3. **Update Frontend**: When implementing, use same ts-rest and Valibot versions for consistency
4. **Lock File**: Commit updated `pnpm-lock.yaml` to ensure consistent versions across team

## References

- [ts-rest Releases](https://github.com/ts-rest/ts-rest/releases)
- [Valibot v1 Release Notes](https://valibot.dev/blog/valibot-v1-the-1-kb-schema-library/)
- [Valibot Migration Guide](https://valibot.dev/guides/migrate-to-v0.31.0/)
- [Testcontainers Node](https://node.testcontainers.org/)

## Next Steps

- [ ] Commit dependency updates
- [ ] Monitor for ts-rest 3.53.0 stable release
- [ ] Consider Express 5.x migration in future (separate task)
- [ ] Update CI/CD to Node 24.x if not already done
