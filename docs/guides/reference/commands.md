---
type: reference
title: 'Sentinel Quick Commands Reference'
status: published
created: 2026-01-20
last_updated: 2026-01-20
ai:
  priority: high
  context_load: on-demand
  triggers:
    - command
    - script
    - pnpm
    - npm
    - build
    - test
  token_budget: 200
---

# Sentinel Quick Commands Reference

Commonly used commands for development, testing, and deployment.

## Package Manager

**All commands use pnpm** (NOT npm or bun)

```bash
# Install dependencies
pnpm install

# Add dependency to specific workspace
pnpm add <package> --filter @sentinel/backend
pnpm add <package> --filter @sentinel/database

# Add dev dependency
pnpm add -D <package>
```

## Development

| Task             | Command             | Description                            |
| ---------------- | ------------------- | -------------------------------------- |
| Start dev server | `pnpm dev`          | Runs backend with hot reload           |
| Start frontend   | `pnpm dev:frontend` | Frontend dev server (when implemented) |
| Start all        | `pnpm dev:all`      | All services concurrently              |

## Testing

| Task              | Command               | Description                   |
| ----------------- | --------------------- | ----------------------------- |
| Run all tests     | `pnpm test`           | Vitest test runner            |
| Run with coverage | `pnpm test:coverage`  | Generate coverage report      |
| Run specific test | `pnpm test <pattern>` | Filter by file/describe block |
| Watch mode        | `pnpm test:watch`     | Re-run on file changes        |
| UI mode           | `pnpm test:ui`        | Vitest UI interface           |

### Test Patterns

```bash
# Run only repository tests
pnpm test repository

# Run specific test file
pnpm test apps/backend/tests/integration/repositories/member-repository.test.ts

# Run tests matching pattern
pnpm test "member.*repository"
```

## Building

| Task          | Command                                 | Description              |
| ------------- | --------------------------------------- | ------------------------ |
| Build all     | `pnpm build`                            | Build all workspaces     |
| Build backend | `pnpm build --filter @sentinel/backend` | Backend only             |
| Clean build   | `pnpm clean && pnpm build`              | Remove dist/ and rebuild |

## Database

### Prisma

| Task             | Command                                 | Description                    |
| ---------------- | --------------------------------------- | ------------------------------ |
| Generate client  | `pnpm prisma generate`                  | Generate Prisma + Kysely types |
| Create migration | `pnpm prisma migrate dev --name <name>` | Create new migration           |
| Apply migrations | `pnpm prisma migrate deploy`            | Apply pending migrations       |
| Reset database   | `pnpm prisma migrate reset`             | Drop DB, apply all migrations  |
| Prisma Studio    | `pnpm prisma studio`                    | GUI database browser           |

### Database Management

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Stop database
docker-compose stop postgres

# View database logs
docker-compose logs -f postgres

# Connect to database
docker-compose exec postgres psql -U sentinel -d sentinel
```

## Linting & Formatting

| Task            | Command          | Description           |
| --------------- | ---------------- | --------------------- |
| Lint code       | `pnpm lint`      | ESLint check          |
| Fix lint issues | `pnpm lint:fix`  | Auto-fix linting      |
| Format code     | `pnpm format`    | Prettier format       |
| Type check      | `pnpm typecheck` | TypeScript validation |

## Docker

| Task               | Command                        | Description                   |
| ------------------ | ------------------------------ | ----------------------------- |
| Start all services | `docker-compose up -d`         | All containers in background  |
| Stop all services  | `docker-compose down`          | Stop and remove containers    |
| View logs          | `docker-compose logs -f`       | Follow logs from all services |
| Rebuild images     | `docker-compose up -d --build` | Rebuild and restart           |

## Git Workflow

```bash
# Create feature branch (if needed)
git checkout -b feature/<name>

# Add and commit changes
git add .
git commit -m "feat: description"

# Push to remote
git push origin feature/<name>

# Create PR to main (via GitHub CLI)
gh pr create --base main --head feature/<name> --title "Title" --body "Description"
```

## Workspace Commands

```bash
# Run command in specific workspace
pnpm --filter @sentinel/backend <command>
pnpm --filter @sentinel/database <command>
pnpm --filter @sentinel/contracts <command>

# Run command in all workspaces
pnpm -r <command>

# List all workspaces
pnpm list --depth 0
```

## Troubleshooting

```bash
# Clear all node_modules and reinstall
pnpm clean:modules
pnpm install

# Clear all build artifacts
pnpm clean

# Clear Prisma generated files
rm -rf node_modules/.prisma
pnpm prisma generate

# Reset everything
pnpm clean:all
pnpm install
pnpm prisma generate
```

## Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local

# Verify environment
pnpm env:check
```

## Related Documentation

- [Architecture Reference](architecture.md)
- [Environment Variables Reference](environment.md)
- [Git Workflow Guide](../../guides/howto/git-workflow.md) (when created)
- [Testing Guide](../../cross-cutting/testing/CLAUDE.md)
