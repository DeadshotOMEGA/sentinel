---
paths:
  - '**/pnpm-workspace.yaml'
  - '**/package.json'
  - '**/tsconfig.json'
---

# Monorepo Structure

pnpm workspaces for monorepo organization. Shared packages in `packages/`, applications in `apps/`.

## Package Naming

**Format**: `@sentinel/<package-name>`

Examples: `@sentinel/backend`, `@sentinel/frontend`, `@sentinel/contracts`, `@sentinel/database`, `@sentinel/types`

## Import Conventions

### Workspace Packages

```typescript
// ✅ Good: Use package name
import { personnelContract } from '@sentinel/contracts'
import { prisma } from '@sentinel/database'

// ❌ Bad: Relative paths across packages
import { personnelContract } from '../../../packages/contracts/src/personnel.contract'
```

### Internal Imports (within same package)

```typescript
// ✅ Good: Use path alias (@)
import { PersonnelRepository } from '@/repositories/personnelRepository'

// ❌ Bad: Relative paths
import { PersonnelRepository } from '../../../repositories/personnelRepository'
```

## Dependency Management

```bash
# Root devDependencies (TypeScript, ESLint, Vitest)
pnpm add -D -w typescript

# Package-specific dependencies
pnpm --filter @sentinel/backend add express
pnpm --filter @sentinel/backend add -D @types/express

# Workspace dependency (local package)
pnpm --filter @sentinel/backend add @sentinel/contracts@workspace:*
```

**Dependency Principles**:

1. Shared devDependencies → Root `package.json`
2. Package-specific → Package `package.json`
3. Workspace dependencies → Use `workspace:*` protocol

## Build Order

Dependencies must build before dependents:

```bash
pnpm -r build  # Build all (respects dependency order)
pnpm --filter @sentinel/backend... build  # Build package + deps
```

**Build Order for Sentinel**:

1. `@sentinel/types` (no dependencies)
2. `@sentinel/database` (depends on types)
3. `@sentinel/contracts` (depends on types)
4. `@sentinel/backend` (depends on all above)
5. `@sentinel/frontend` (depends on contracts, types)

## Development Workflow

```bash
# Watch mode (separate terminals)
pnpm --filter @sentinel/contracts dev  # Terminal 1
pnpm --filter @sentinel/backend dev    # Terminal 2
```

## Environment Variables

**Per-package `.env.local` files**:

```
sentinel/
├── apps/backend/.env.local        # Backend vars
├── apps/frontend/.env.local       # Frontend vars
└── .env.local                     # Shared vars
```

**Load in packages**:

```typescript
import dotenv from 'dotenv'
import path from 'path'

// Load root .env.local
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })

// Load package-specific (overrides root)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
```

## Common Commands

| Task           | Command                                       |
| -------------- | --------------------------------------------- |
| Install all    | `pnpm install`                                |
| Dev (backend)  | `pnpm dev`                                    |
| Test all       | `pnpm test`                                   |
| Build all      | `pnpm -r build`                               |
| Build specific | `pnpm --filter @sentinel/backend build`       |
| Add to package | `pnpm --filter @sentinel/backend add express` |
| Add to root    | `pnpm add -D -w typescript`                   |

## TypeScript Configuration

**Root tsconfig.json** (shared):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  }
}
```

**Package tsconfig.json** (extends root):

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "references": [{ "path": "../contracts" }, { "path": "../database" }]
}
```

**Note**: Use `references` for TypeScript project references (faster builds).

## Common Mistakes

### ❌ Don't Use npm/yarn (Use pnpm)

**Bad**: `npm install`, `yarn add express`
**Good**: `pnpm install`, `pnpm add express`
**Why**: Bun not installed. pnpm configured and faster in WSL2.

### ❌ Don't Install at Root (Unless Shared)

**Bad**: `pnpm add express` (installs at root)
**Good**: `pnpm --filter @sentinel/backend add express`

### ❌ Don't Use Relative Imports Across Packages

**Bad**: `import { Contract } from '../../../packages/contracts/src/personnel.contract'`
**Good**: `import { Contract } from '@sentinel/contracts'`

### ❌ Don't Forget to Build Shared Packages

**Bad**: Make changes to `packages/contracts`, run backend without rebuilding contracts
**Good**: `pnpm --filter @sentinel/contracts build` (or run in watch mode)

## Package Publishing

Packages are **NOT published to npm**. Internal use only via `workspace:*` protocol.

## Full Guide

**See**: `@docs/guides/monorepo-setup-guide.md` for comprehensive workspace configuration, TypeScript project references, and troubleshooting.
