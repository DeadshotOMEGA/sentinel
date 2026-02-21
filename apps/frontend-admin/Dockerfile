FROM node:24.11.0-alpine3.21 AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/frontend-admin/package.json ./apps/frontend-admin/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/database/package.json ./packages/database/package.json

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm --filter @sentinel/database prisma:generate
RUN pnpm --filter frontend-admin build

FROM node:24.11.0-alpine3.21 AS runtime

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/frontend-admin/package.json ./apps/frontend-admin/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/database/package.json ./packages/database/package.json

COPY --from=build /workspace/apps/frontend-admin ./apps/frontend-admin
COPY --from=build /workspace/packages/contracts ./packages/contracts
COPY --from=build /workspace/packages/types ./packages/types
COPY --from=build /workspace/packages/database ./packages/database

RUN pnpm install --frozen-lockfile --ignore-scripts \
  --filter frontend-admin... \
  --filter @sentinel/contracts... \
  --filter @sentinel/types... \
  --filter @sentinel/database...

ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_WS_URL=
ENV BACKEND_INTERNAL_URL=http://backend:3000

WORKDIR /app/apps/frontend-admin

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/', (r) => { process.exit(r.statusCode >= 200 && r.statusCode < 500 ? 0 : 1); }).on('error', () => process.exit(1))"

CMD ["pnpm", "exec", "next", "start", "-p", "3001"]
