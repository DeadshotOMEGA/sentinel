# Monorepo Structure

Apply to: All code organization and package management in Sentinel monorepo

## Rule

Use pnpm workspaces for monorepo organization. Shared packages in `packages/`, applications in `apps/`.

## When This Applies

- Creating new packages or apps
- Importing code across packages
- Managing dependencies
- Building or deploying

## Project Structure

```
sentinel/
├── apps/
│   ├── backend/              # Express API server
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/             # Next.js web app (TBD)
│   │   └── package.json
│   └── kiosk/                # Kiosk display app (TBD)
│       └── package.json
├── packages/
│   ├── contracts/            # API contracts (ts-rest + Valibot)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── personnel.contract.ts
│   │   │   ├── attendance.contract.ts
│   │   │   └── schemas/     # Valibot schemas
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── database/             # Prisma schema + Kysely setup
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── client.ts    # Prisma client export
│   │   │   └── kysely.ts    # Kysely setup
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── types/                # Shared TypeScript types
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/                     # Research & documentation (existing)
├── .claude/                  # Claude Code configuration
├── pnpm-workspace.yaml       # Workspace definition
├── package.json              # Root package.json
└── tsconfig.json             # Root TypeScript config
```

## pnpm Workspace Configuration

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root package.json

```json
{
  "name": "sentinel",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @sentinel/backend dev",
    "dev:frontend": "pnpm --filter @sentinel/frontend dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:coverage": "pnpm -r test:coverage",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "prisma:generate": "pnpm --filter @sentinel/database prisma:generate",
    "prisma:migrate": "pnpm --filter @sentinel/database prisma:migrate"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

## Package Naming Convention

**Format**: `@sentinel/<package-name>`

Examples:
- `@sentinel/backend`
- `@sentinel/frontend`
- `@sentinel/contracts`
- `@sentinel/database`
- `@sentinel/types`

## Package.json Templates

### Shared Package (contracts, types)

```json
{
  "name": "@sentinel/contracts",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ts-rest/core": "^3.45.0",
    "valibot": "^0.30.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

### Application Package (backend, frontend)

```json
{
  "name": "@sentinel/backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@sentinel/contracts": "workspace:*",
    "@sentinel/database": "workspace:*",
    "@sentinel/types": "workspace:*",
    "express": "^4.18.0",
    "better-auth": "^1.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

**Note**: `"workspace:*"` references local packages in the monorepo.

## Import Conventions

### Importing from Workspace Packages

```typescript
// ✅ Good: Use package name
import { personnelContract } from '@sentinel/contracts'
import { prisma } from '@sentinel/database'
import type { Personnel } from '@sentinel/types'

// ❌ Bad: Relative paths across packages
import { personnelContract } from '../../../packages/contracts/src/personnel.contract'
```

### Internal Imports (within same package)

```typescript
// ✅ Good: Use path alias (@)
import { PersonnelRepository } from '@/repositories/personnelRepository'
import { auth } from '@/lib/auth'

// ❌ Bad: Relative paths
import { PersonnelRepository } from '../../../repositories/personnelRepository'
```

### Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Dependency Management

### Installing Dependencies

```bash
# Root-level devDependencies (TypeScript, ESLint, etc.)
pnpm add -D -w typescript

# Package-specific dependencies
pnpm --filter @sentinel/backend add express
pnpm --filter @sentinel/backend add -D @types/express

# Workspace dependency (local package)
pnpm --filter @sentinel/backend add @sentinel/contracts@workspace:*
```

### Dependency Principles

1. **Shared devDependencies** → Root `package.json`
   - TypeScript, ESLint, Prettier, Vitest
2. **Package-specific dependencies** → Package `package.json`
   - Express (backend), React (frontend)
3. **Workspace dependencies** → Use `workspace:*` protocol
   - `@sentinel/contracts`, `@sentinel/database`, etc.

## Building Packages

### Build Order

Dependencies must build before dependents:

```bash
# Build all packages (respects dependency order)
pnpm -r build

# Build specific package and its dependencies
pnpm --filter @sentinel/backend... build
```

**Build Order for Sentinel**:
1. `@sentinel/types` (no dependencies)
2. `@sentinel/database` (depends on types)
3. `@sentinel/contracts` (depends on types)
4. `@sentinel/backend` (depends on all above)
5. `@sentinel/frontend` (depends on contracts, types)

### Development Workflow

```bash
# Watch mode for shared packages (run in separate terminals)
pnpm --filter @sentinel/contracts dev  # Terminal 1
pnpm --filter @sentinel/backend dev    # Terminal 2
```

## Environment Variables

### Per-Package .env Files

```
sentinel/
├── apps/
│   ├── backend/
│   │   └── .env.local        # Backend-specific vars
│   └── frontend/
│       └── .env.local        # Frontend-specific vars
└── .env.local                # Shared vars (if needed)
```

### Shared Environment Variables

For variables used across packages, use root `.env.local`:

```bash
# sentinel/.env.local
DATABASE_URL=postgresql://...
```

Load in packages:

```typescript
// apps/backend/src/index.ts
import dotenv from 'dotenv'
import path from 'path'

// Load root .env.local
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })

// Load package-specific .env.local (overrides root)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
```

## TypeScript Configuration

### Root tsconfig.json (Shared)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  },
  "exclude": ["node_modules", "dist"]
}
```

### Package tsconfig.json (Extends Root)

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../contracts" },
    { "path": "../database" }
  ]
}
```

**Note**: Use `references` for TypeScript project references (faster builds).

## Common pnpm Commands

| Task | Command |
|------|---------|
| Install all dependencies | `pnpm install` |
| Run dev server (backend) | `pnpm dev` |
| Run all tests | `pnpm test` |
| Build all packages | `pnpm -r build` |
| Build specific package | `pnpm --filter @sentinel/backend build` |
| Add dependency to package | `pnpm --filter @sentinel/backend add express` |
| Add devDependency to root | `pnpm add -D -w typescript` |
| Run command in all packages | `pnpm -r <command>` |
| Run command in specific package + deps | `pnpm --filter @sentinel/backend... build` |

## Common Mistakes

### ❌ Don't Use npm/yarn (Use pnpm)

**Bad**:
```bash
npm install
yarn add express
```

**Good**:
```bash
pnpm install
pnpm add express
```

**Why**: Bun is not installed. pnpm is configured and faster in WSL2.

### ❌ Don't Install Packages at Root (Unless Shared)

**Bad**:
```bash
pnpm add express  # ❌ Installs at root
```

**Good**:
```bash
pnpm --filter @sentinel/backend add express  # ✅ Installs in backend
```

### ❌ Don't Use Relative Imports Across Packages

**Bad**:
```typescript
// In apps/backend/src/routes/personnel.ts
import { personnelContract } from '../../../packages/contracts/src/personnel.contract'
```

**Good**:
```typescript
import { personnelContract } from '@sentinel/contracts'
```

### ❌ Don't Forget to Build Shared Packages

**Bad**:
```bash
# Changes to packages/contracts not reflected
pnpm --filter @sentinel/backend dev
```

**Good**:
```bash
# Build contracts first (or run in watch mode)
pnpm --filter @sentinel/contracts build
pnpm --filter @sentinel/backend dev
```

## Package Publishing (Internal Only)

Packages in this monorepo are **NOT published to npm**. They are only used internally via `workspace:*` protocol.

## Related

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
