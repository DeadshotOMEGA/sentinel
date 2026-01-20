# Deployment Documentation (AI-First Guide)

**Purpose:** CI/CD, infrastructure, and release process documentation

**AI Context Priority:** medium

**When to Load:** User working on CI/CD, deployment, infrastructure, releases

**Triggers:** deploy, deployment, ci, cd, github-actions, docker, release

---

## Quick Reference

### What's Here

Deployment and infrastructure documentation:
- CI/CD pipeline (GitHub Actions)
- Docker containerization
- Release process
- Environment configuration
- Infrastructure as code

### Current Status

**Phase 4 of Backend Rebuild** - Not yet implemented
**See:** [Backend Rebuild Plan - Phase 4](../../plans/active/backend-rebuild-plan.md#phase-4-production-readiness-weeks-7-8)

---

## Planned Infrastructure

### CI/CD Pipeline

**GitHub Actions workflows:**
- Test workflow - Run on push/PR
- Build workflow - Build artifacts
- Deploy workflow - Deploy to environments
- Release workflow - Create releases

**Test workflow:**
```yaml
on: [push, pull_request]
steps:
  - Setup Node.js 22 + pnpm
  - Install dependencies
  - Run type checking
  - Run tests with coverage
  - Upload coverage to Codecov
  - Fail if coverage < 80%
```

### Docker Setup

**Multi-stage build:**
- Builder stage: Install deps, build TypeScript
- Production stage: Copy artifacts, minimal runtime

**Images:**
- `sentinel-backend:latest` - Main API server
- `sentinel-db-migrations:latest` - Prisma migrations

### Environment Configuration

**Environments:**
- Development (local)
- Staging (pre-production)
- Production (live)

**Secrets management:**
- GitHub Secrets for CI/CD
- Environment variables via .env files
- Never commit secrets to git

---

## Document Examples

### Explanation Docs
- `explanation-cicd-pipeline.md` - Pipeline architecture
- `explanation-docker-strategy.md` - Containerization approach
- `explanation-environments.md` - Environment differences

### Reference Docs
- `reference-github-actions.md` - Workflow specifications
- `reference-docker-images.md` - Image builds and tags
- `reference-environment-vars.md` - Required env vars

### How-to Docs
- `howto-deploy-staging.md` - Deploy to staging
- `howto-deploy-production.md` - Production deployment
- `howto-rollback-deployment.md` - Rollback procedure
- `howto-run-migrations.md` - Database migration process

---

## Deployment Process

### Staging Deployment

**Trigger:** Merge to `develop` branch

**Steps:**
1. Run all tests
2. Build Docker image
3. Push to container registry
4. Run migrations (staging DB)
5. Deploy to staging environment
6. Run smoke tests
7. Notify team

### Production Deployment

**Trigger:** Merge to `main` branch OR manual release

**Steps:**
1. Run all tests
2. Build production Docker image
3. Tag with version number
4. Push to container registry
5. Backup production database
6. Run migrations (production DB)
7. Deploy new version (blue-green)
8. Run health checks
9. Monitor for errors
10. Rollback if issues detected

---

## Pre-commit Hooks

**Husky + lint-staged:**

```json
{
  "lint-staged": {
    "apps/**/*.ts": ["eslint --fix", "prettier --write", "pnpm test --run --related"],
    "packages/**/*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

**Prevents:**
- Committing code that doesn't pass linting
- Committing code with test failures
- Committing poorly formatted code

---

## Release Process

### Semantic Versioning

**Format:** `vMAJOR.MINOR.PATCH`

**Bump rules:**
- MAJOR: Breaking changes
- MINOR: New features (backwards-compatible)
- PATCH: Bug fixes

### Creating Releases

**Using gh CLI:**
```bash
# Create release with changelog
gh release create v1.2.0 \
  --title "Version 1.2.0" \
  --notes-file CHANGELOG.md \
  --latest
```

**Automated:**
- GitHub Actions release workflow
- Triggered by version tags
- Generates changelog from commits
- Creates GitHub release

---

## Health Monitoring

### Health Endpoints

**Implemented in Phase 2:**
- `/health` - Overall health (DB + Redis)
- `/ready` - Kubernetes readiness probe
- `/live` - Kubernetes liveness probe
- `/metrics` - Performance metrics

### Deployment Verification

**Post-deployment checks:**
1. Health endpoint returns 200
2. Database connection working
3. Redis connection working
4. API endpoints responding
5. WebSocket connections working
6. Error rate < 0.1%

---

## Related Documentation

**Implementation plan:**
- [Backend Rebuild Plan - Phase 4.2](../../plans/active/backend-rebuild-plan.md#42-cicd-pipeline)

**Monitoring:**
- [Monitoring CLAUDE.md](../monitoring/CLAUDE.md) - Logs and metrics

**Git workflow:**
- [Git Flow Rule](../../../../.claude/rules/git-workflow.md)

---

**Last Updated:** 2026-01-19
