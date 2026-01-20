Generate comprehensive markdown research reports from all the research findings and save them to /home/sauk/projects/sentinel-v2/docs/.

You have access to these research files:
- /home/sauk/projects/sentinel/BACKEND-ARCHITECTURE-ANALYSIS.md (current backend analysis)
- Research agent outputs for:
  - Web frameworks (Express, Fastify, Hono, Elysia, NestJS, tRPC, Encore)
  - ORMs (Prisma, Drizzle, Kysely, TypeORM, MikroORM, Sequelize)
  - Authentication solutions (better-auth, Auth.js, Passport, Clerk, etc.)
  - Real-time communication (Socket.IO, SSE, Centrifugo, etc.)
  - Validation & Type Safety (Zod, Valibot, tRPC, ts-rest, Hono RPC)
  - Testing strategies (Vitest, Bun test, Testcontainers, etc.)

Create the following markdown reports in /home/sauk/projects/sentinel-v2/docs/:

1. **01-current-backend-analysis.md**
   - Copy and format the existing backend architecture analysis
   - Include strengths, weaknesses, and current tech stack

2. **02-framework-comparison.md**
   - Comprehensive comparison of all frameworks researched
   - Performance benchmarks, Bun compatibility, pros/cons tables
   - Recommendations by use case
   - Migration strategies

3. **03-orm-database-comparison.md**
   - Detailed ORM comparison with benchmarks
   - Performance data, bundle sizes, type safety analysis
   - Hybrid approaches (Prisma + Kysely)
   - Recommendations

4. **04-authentication-solutions.md**
   - All auth solutions compared
   - Self-hosted vs SaaS
   - API key support, offline capabilities
   - Recommended solution (better-auth) with implementation guide

5. **05-realtime-communication.md**
   - WebSocket vs SSE vs other protocols
   - Socket.IO analysis (current solution)
   - Alternatives comparison
   - Recommendation to stay with Socket.IO

6. **06-validation-type-safety.md**
   - Validation library comparison (Zod v4, Valibot, TypeBox, ArkType)
   - Type safety solutions (tRPC, ts-rest, Hono RPC)
   - Bundle size analysis
   - Recommendation: ts-rest + Valibot

7. **07-testing-strategy.md**
   - Test framework comparison
   - Testing strategies (unit, integration, E2E, property-based)
   - Testcontainers, Supertest, MSW
   - Recommendations and implementation roadmap

8. **00-EXECUTIVE-SUMMARY.md**
   - High-level overview of all findings
   - Top recommendations for each category
   - Migration priorities
   - Implementation timeline

Format each document with:
- Clear table of contents
- Comparison tables
- Code examples where relevant
- Citations/sources at the end
- Decision matrices
- Clear "Recommended Solution" sections

Use professional markdown formatting with proper headings, tables, code blocks, and lists.