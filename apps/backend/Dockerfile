# Production-only Dockerfile (build artifacts copied from host)
FROM node:24-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package manifests
COPY packages/database/package.json ./packages/database/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/types/package.json ./packages/types/
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies only (skip dev dependencies and lifecycle scripts)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy source files and generated artifacts
# All shared packages export TypeScript source directly
COPY packages/database/src ./packages/database/src
COPY packages/database/generated ./packages/database/generated
COPY packages/database/prisma ./packages/database/prisma
COPY packages/contracts/src ./packages/contracts/src
COPY packages/types/src ./packages/types/src
# Backend: built JavaScript (must build locally first: pnpm build)
COPY apps/backend/dist ./apps/backend/dist

# Set working directory to backend
WORKDIR /app/apps/backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Run migrations and start server
CMD ["sh", "-c", "pnpm --filter @sentinel/database prisma:migrate:deploy && node dist/index.js"]
