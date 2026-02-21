FROM node:24.11.0-alpine3.21 AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /workspace
ENV DATABASE_URL=postgresql://sentinel:sentinel@localhost:5432/sentinel?schema=public

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend-admin/package.json ./apps/frontend-admin/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/types/package.json ./packages/types/package.json

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm --filter @sentinel/database prisma:generate
RUN pnpm -r build

FROM node:24.11.0-alpine3.21 AS runtime

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/types/package.json ./packages/types/package.json

COPY --from=build /workspace/apps/backend ./apps/backend
COPY --from=build /workspace/packages/database ./packages/database
COPY --from=build /workspace/packages/contracts ./packages/contracts
COPY --from=build /workspace/packages/types ./packages/types

RUN pnpm install --frozen-lockfile --ignore-scripts \
  --filter @sentinel/backend... \
  --filter @sentinel/database... \
  --filter @sentinel/contracts... \
  --filter @sentinel/types...

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app/apps/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
