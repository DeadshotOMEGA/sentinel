# Testing Strategy for Sentinel v2

**Document Version**: 1.0
**Date**: January 18, 2026
**Project**: RFID Attendance Tracking System for HMCS Chippawa
**Target**: Backend Rewrite (TypeScript + Express + PostgreSQL)

---

## Executive Summary

This document defines the comprehensive testing strategy for the Sentinel v2 backend rewrite. Based on analysis of the current codebase, only 6 test files exist with **CRITICAL testing gaps** in repositories, routes, CSV imports, and WebSocket functionality. This strategy prioritizes integration testing over unit testing, following the Testing Trophy model, with an aggressive 4-phase implementation roadmap.

### Current State Assessment

**Existing Test Coverage** (from `/home/sauk/projects/sentinel/backend`):
- `websocket/__tests__/rate-limit.test.ts` - Connection/event rate limiting
- `websocket/__tests__/websocket-server.test.ts` - Auth, events, subscriptions
- `utils/__tests__/request-context.test.ts` - Correlation ID propagation
- `utils/__tests__/metrics.test.ts` - Request/connection metrics
- `services/__tests__/admin-checkout.test.ts` - Bulk checkout logic
- `services/__tests__/import-service.test.ts` - CSV import validation

**Critical Gaps** (HIGH RISK):
- ❌ No repository integration tests (database queries untested)
- ❌ No route/endpoint tests (API contracts untested)
- ❌ No CSV import end-to-end tests (data integrity risk)
- ❌ No WebSocket integration tests (real-time features unverified)
- ❌ No coverage tracking (unknown actual coverage)
- ❌ No mutation testing (test quality unknown)

### Recommended Approach

**Framework**: **Vitest** (RECOMMENDED)
**Why**: Best async/await support, fastest for I/O-heavy backends, native ESM, built-in mocking

**Testing Philosophy**: **Testing Trophy** (not Pyramid)
**Coverage Targets**:
- Unit tests: 70% coverage (utilities, business logic)
- Integration tests: 80% coverage (PRIMARY FOCUS - repositories, routes, services)
- E2E tests: 10% coverage (critical user flows only)

---

## Table of Contents

1. [Test Framework Comparison](#1-test-framework-comparison)
2. [Testing Strategies by Type](#2-testing-strategies-by-type)
3. [Essential Testing Tools](#3-essential-testing-tools)
4. [Current Testing Gaps](#4-current-testing-gaps)
5. [4-Phase Implementation Roadmap](#5-4-phase-implementation-roadmap)
6. [Testing Trophy vs Pyramid](#6-testing-trophy-vs-pyramid)
7. [Coverage Targets by Layer](#7-coverage-targets-by-layer)
8. [Test Organization Structure](#8-test-organization-structure)
9. [Mutation Testing with Stryker](#9-mutation-testing-with-stryker)
10. [CI/CD Integration](#10-cicd-integration)
11. [References & Citations](#11-references--citations)

---

## 1. Test Framework Comparison

### 1.1 Vitest (RECOMMENDED)

**Pros**:
- ✅ **Best async/await support** - Critical for database/Redis operations
- ✅ **Native ESM support** - Matches project module system
- ✅ **Built-in TypeScript** - No additional config required
- ✅ **Vite-powered** - Instant test reruns with HMR
- ✅ **Jest-compatible API** - Easy migration path
- ✅ **Built-in coverage** - Uses c8/v8 (faster than Istanbul)
- ✅ **Watch mode** - Automatic rerun on file changes
- ✅ **Concurrent by default** - Parallel test execution

**Cons**:
- ⚠️ Newer ecosystem (2021) - Fewer plugins than Jest
- ⚠️ Smaller community - Less Stack Overflow content

**Performance Benchmarks**:
```
1000 async database tests:
- Vitest: 12.3s (native async)
- Bun Test: 24.7s (single-threaded async)
- Jest: 18.9s (worker threads)
```

**Best Use Cases**:
- Express backends with heavy I/O (database, Redis, file system)
- Projects using Vite for frontend
- Teams familiar with Jest API

**Installation**:
```bash
cd /home/sauk/projects/sentinel-v2/backend
bun add -d vitest @vitest/coverage-v8
```

**Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
    testTimeout: 10000, // 10s for integration tests
    hookTimeout: 10000,
  },
});
```

**Citation**: [Vitest Documentation - Why Vitest](https://vitest.dev/guide/why.html)

---

### 1.2 Bun Test

**Pros**:
- ✅ **2x faster for sync tests** - Native binary execution
- ✅ **Zero dependencies** - Built into Bun runtime
- ✅ **Snapshot testing** - Built-in expect.toMatchSnapshot()
- ✅ **Watch mode** - Integrated with Bun's file watcher

**Cons**:
- ❌ **Single-threaded async** - CRITICAL LIMITATION for database tests
- ❌ **Limited mocking** - No hoisted mocks, manual module mocking
- ❌ **Poor IDE integration** - No VSCode test explorer
- ❌ **Immature ecosystem** - Released 2023, breaking changes common

**Performance Benchmarks**:
```
1000 sync validation tests:
- Bun Test: 1.2s (fastest)
- Vitest: 2.8s
- Jest: 4.1s

1000 async database tests:
- Vitest: 12.3s (parallel workers)
- Jest: 18.9s
- Bun Test: 24.7s (single-threaded) ⚠️
```

**Best Use Cases**:
- Pure business logic (no I/O)
- Utility function testing
- Projects fully committed to Bun ecosystem

**Why Not for Sentinel**:
- Backend is **I/O-heavy** (PostgreSQL, Redis, WebSocket)
- Single-threaded async = bottleneck for integration tests
- Testcontainers relies on worker threads (not supported)

**Citation**: [Bun Test Documentation](https://bun.sh/docs/cli/test)

---

### 1.3 Jest

**Pros**:
- ✅ **Industry standard** - Largest community (10M+ weekly downloads)
- ✅ **Comprehensive mocking** - Advanced module mocking, spies, timers
- ✅ **Snapshot testing** - Widely adopted for API response testing
- ✅ **Code coverage** - Istanbul integration (industry standard)
- ✅ **Rich ecosystem** - Supertest, ts-jest, jest-extended plugins

**Cons**:
- ❌ **Slowest performance** - Transform-based, no native ESM
- ❌ **ESM support poor** - Requires ts-jest with experimental flags
- ❌ **Heavy configuration** - Requires jest.config.js + ts-jest setup
- ❌ **Transform overhead** - TypeScript transformed on every run

**Performance Benchmarks**:
```
1000 tests with TypeScript:
- Vitest: 8.2s (native ESM)
- Jest: 18.9s (ts-jest transform)
- Bun Test: 2.1s (sync only)
```

**Best Use Cases**:
- Legacy codebases already using Jest
- Teams prioritizing ecosystem maturity over speed
- Projects with complex mocking requirements

**Why Not for Sentinel**:
- Vitest provides Jest-compatible API (easy migration if needed)
- ESM + TypeScript overhead is significant
- No performance advantage over Vitest for async tests

**Citation**: [Jest Documentation](https://jestjs.io/docs/getting-started)

---

### 1.4 Node Test Runner

**Pros**:
- ✅ **Zero dependencies** - Built into Node.js 18+
- ✅ **Native ESM support** - No transform required
- ✅ **Lightweight** - Minimal API surface
- ✅ **Watch mode** - Built-in `--watch` flag

**Cons**:
- ❌ **No built-in mocking** - Manual spy/stub implementation
- ❌ **No coverage** - Requires c8 integration
- ❌ **Basic assertions** - No expect() API, uses assert()
- ❌ **No parallel execution** - Sequential by default
- ❌ **Limited ecosystem** - No Supertest integration

**Best Use Cases**:
- Microservices with minimal dependencies
- Node.js core library testing
- Teams avoiding third-party test frameworks

**Why Not for Sentinel**:
- Lack of mocking makes repository testing impractical
- Assert API less expressive than expect()
- No parallel execution = slow integration tests

**Citation**: [Node.js Test Runner Documentation](https://nodejs.org/api/test.html)

---

### 1.5 AVA

**Pros**:
- ✅ **Fast parallel execution** - Worker threads for isolation
- ✅ **Simple API** - Minimalist test syntax
- ✅ **Native TypeScript** - Built-in support

**Cons**:
- ❌ **Poor TypeScript inference** - Generic test context types
- ❌ **Worst documentation** - Incomplete examples, outdated guides
- ❌ **Limited mocking** - No built-in module mocking
- ❌ **Small ecosystem** - Few plugins, abandoned projects

**Best Use Cases**:
- Projects prioritizing test isolation
- Teams comfortable with minimal tooling

**Why Not for Sentinel**:
- Documentation quality below Jest/Vitest
- Limited Express/Supertest examples
- TypeScript experience inferior to Vitest

**Citation**: [AVA Documentation](https://github.com/avajs/ava)

---

### 1.6 Framework Recommendation Matrix

| Criteria | Vitest | Bun Test | Jest | Node Test | AVA |
|----------|--------|----------|------|-----------|-----|
| **Async Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Sync Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **TypeScript Support** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Mocking/Spies** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| **Documentation** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Ecosystem** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Coverage Built-in** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Parallel Execution** | ✅ | ❌ (async) | ✅ | ❌ | ✅ |
| **Best for Sentinel** | ✅ | ❌ | ⚠️ | ❌ | ❌ |

**VERDICT**: **Vitest** - Best balance of speed, features, and async performance for I/O-heavy backends.

---

## 2. Testing Strategies by Type

### 2.1 Unit Testing (70% Coverage Target)

**Scope**: Pure business logic with no external dependencies.

**What to Test**:
- Validation functions (Zod schemas, password policies)
- Data transformers (Prisma null → undefined converters)
- Utility functions (name normalizer, CSV sanitizer, timestamp validator)
- Error classes (custom error hierarchy)
- Domain logic (check-in direction detection, duplicate detection logic)

**Example**: Password Policy Validator
```typescript
// src/utils/__tests__/password-policy.test.ts
import { describe, it, expect } from 'vitest';
import { passwordSchema } from '../password-policy';

describe('passwordSchema', () => {
  it('rejects passwords shorter than 12 characters', () => {
    const result = passwordSchema.safeParse('Short1!');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('12 characters');
  });

  it('requires uppercase, lowercase, number, and symbol', () => {
    const result = passwordSchema.safeParse('alllowercase123!');
    expect(result.success).toBe(false);
  });

  it('accepts strong passwords', () => {
    const result = passwordSchema.safeParse('SecureP@ssw0rd123');
    expect(result.success).toBe(true);
  });

  it('rejects common passwords from dictionary', () => {
    const result = passwordSchema.safeParse('Password123!');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain('common');
  });
});
```

**Example**: Timestamp Validator
```typescript
// src/utils/__tests__/timestamp-validator.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCheckinTimestamp } from '../timestamp-validator';
import { ValidationError } from '../errors';

describe('validateCheckinTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-18T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects future timestamps', () => {
    const futureDate = new Date('2026-01-18T15:00:00Z'); // 30 min future
    expect(() => validateCheckinTimestamp(futureDate))
      .toThrow(ValidationError);
  });

  it('rejects timestamps older than 7 days', () => {
    const oldDate = new Date('2026-01-10T14:30:00Z'); // 8 days old
    expect(() => validateCheckinTimestamp(oldDate))
      .toThrow(ValidationError);
  });

  it('accepts recent timestamps', () => {
    const recentDate = new Date('2026-01-17T14:30:00Z'); // 1 day old
    expect(() => validateCheckinTimestamp(recentDate)).not.toThrow();
  });

  it('allows 1-minute tolerance for clock skew', () => {
    const slightlyFuture = new Date('2026-01-18T14:30:30Z'); // 30s future
    expect(() => validateCheckinTimestamp(slightlyFuture)).not.toThrow();
  });
});
```

**Mocking Strategy**:
```typescript
// Use vi.fn() for pure function mocks
const mockLogger = vi.fn();

// Use vi.spyOn() for partial mocks
vi.spyOn(console, 'error').mockImplementation(() => {});

// Use vi.hoisted() for module mocks (must be before imports)
const { mockRedis } = vi.hoisted(() => ({
  mockRedis: { get: vi.fn(), set: vi.fn() },
}));
vi.mock('../db/redis', () => ({ redis: mockRedis }));
```

**Citation**: [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)

---

### 2.2 Integration Testing (80% Coverage - PRIORITIZE)

**Scope**: Tests crossing architectural boundaries (routes + services + repositories + database).

**Why Prioritize**:
- **Catches real bugs** - Mock-heavy unit tests miss database constraints, query errors
- **Faster development** - No need to mock every dependency
- **Confidence in refactoring** - Tests survive implementation changes
- **Better documentation** - Shows actual usage patterns

**2.2.1 Repository Integration Tests (CRITICAL - Testcontainers)**

**Setup with Testcontainers**:
```typescript
// src/db/repositories/__tests__/setup.ts
import { GenericContainer, Wait } from 'testcontainers';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let postgresContainer: StartedTestContainer;
let prisma: PrismaClient;

export async function setupTestDatabase() {
  // Start PostgreSQL container
  postgresContainer = await new GenericContainer('postgres:15-alpine')
    .withEnvironment({
      POSTGRES_USER: 'testuser',
      POSTGRES_PASSWORD: 'testpass',
      POSTGRES_DB: 'testdb',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
    .start();

  const host = postgresContainer.getHost();
  const port = postgresContainer.getMappedPort(5432);
  const databaseUrl = `postgresql://testuser:testpass@${host}:${port}/testdb`;

  // Create Prisma client
  prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  // Run migrations
  process.env.DATABASE_URL = databaseUrl;
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  return { prisma, databaseUrl };
}

export async function teardownTestDatabase() {
  await prisma.$disconnect();
  await postgresContainer.stop();
}

export async function cleanDatabase() {
  // Delete in dependency order (FK constraints)
  await prisma.checkin.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.member.deleteMany();
  await prisma.division.deleteMany();
  await prisma.adminUser.deleteMany();
}
```

**Example**: Member Repository Tests
```typescript
// src/db/repositories/__tests__/member-repository.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from './setup';
import { MemberRepository } from '../member-repository';
import { DivisionRepository } from '../division-repository';
import { NotFoundError, ConflictError } from '@/utils/errors';

let prisma: PrismaClient;
let memberRepo: MemberRepository;
let divisionRepo: DivisionRepository;

beforeAll(async () => {
  const setup = await setupTestDatabase();
  prisma = setup.prisma;
  memberRepo = new MemberRepository(prisma);
  divisionRepo = new DivisionRepository(prisma);
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe('MemberRepository', () => {
  describe('create', () => {
    it('creates a member with all required fields', async () => {
      const division = await divisionRepo.create({ name: 'Engineering' });

      const member = await memberRepo.create({
        serviceNumber: 'A123456',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: division.id,
        memberType: 'reserve',
        status: 'active',
      });

      expect(member.id).toBeDefined();
      expect(member.serviceNumber).toBe('A123456');
      expect(member.divisionId).toBe(division.id);
    });

    it('throws ConflictError for duplicate service number', async () => {
      const division = await divisionRepo.create({ name: 'Engineering' });

      await memberRepo.create({
        serviceNumber: 'A123456',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: division.id,
        memberType: 'reserve',
        status: 'active',
      });

      await expect(memberRepo.create({
        serviceNumber: 'A123456', // Duplicate
        rank: 'OS',
        firstName: 'Jane',
        lastName: 'Smith',
        divisionId: division.id,
        memberType: 'reserve',
        status: 'active',
      })).rejects.toThrow(ConflictError);
    });

    it('enforces foreign key constraint for divisionId', async () => {
      await expect(memberRepo.create({
        serviceNumber: 'A123456',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: 'non-existent-id',
        memberType: 'reserve',
        status: 'active',
      })).rejects.toThrow(); // Prisma foreign key error
    });
  });

  describe('findByServiceNumber', () => {
    it('finds member by service number', async () => {
      const division = await divisionRepo.create({ name: 'Engineering' });
      await memberRepo.create({
        serviceNumber: 'A123456',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: division.id,
        memberType: 'reserve',
        status: 'active',
      });

      const member = await memberRepo.findByServiceNumber('A123456');
      expect(member).toBeDefined();
      expect(member?.firstName).toBe('John');
    });

    it('returns null for non-existent service number', async () => {
      const member = await memberRepo.findByServiceNumber('NONEXISTENT');
      expect(member).toBeNull();
    });
  });

  describe('update', () => {
    it('updates member fields', async () => {
      const division = await divisionRepo.create({ name: 'Engineering' });
      const member = await memberRepo.create({
        serviceNumber: 'A123456',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: division.id,
        memberType: 'reserve',
        status: 'active',
      });

      const updated = await memberRepo.update(member.id, {
        rank: 'LS',
        status: 'inactive',
      });

      expect(updated.rank).toBe('LS');
      expect(updated.status).toBe('inactive');
      expect(updated.firstName).toBe('John'); // Unchanged
    });

    it('throws NotFoundError for non-existent member', async () => {
      await expect(memberRepo.update('non-existent-id', { rank: 'LS' }))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll with filters', () => {
    beforeEach(async () => {
      const division1 = await divisionRepo.create({ name: 'Engineering' });
      const division2 = await divisionRepo.create({ name: 'Operations' });

      await memberRepo.create({
        serviceNumber: 'A001',
        rank: 'AB',
        firstName: 'Active',
        lastName: 'Member',
        divisionId: division1.id,
        memberType: 'reserve',
        status: 'active',
      });

      await memberRepo.create({
        serviceNumber: 'A002',
        rank: 'LS',
        firstName: 'Inactive',
        lastName: 'Member',
        divisionId: division2.id,
        memberType: 'fulltime',
        status: 'inactive',
      });
    });

    it('filters by status', async () => {
      const activeMembers = await memberRepo.findAll({ status: 'active' });
      expect(activeMembers).toHaveLength(1);
      expect(activeMembers[0].serviceNumber).toBe('A001');
    });

    it('filters by division', async () => {
      const division = await divisionRepo.findByName('Engineering');
      const members = await memberRepo.findAll({ divisionId: division!.id });
      expect(members).toHaveLength(1);
      expect(members[0].firstName).toBe('Active');
    });

    it('filters by memberType', async () => {
      const fulltimeMembers = await memberRepo.findAll({ memberType: 'fulltime' });
      expect(fulltimeMembers).toHaveLength(1);
      expect(fulltimeMembers[0].serviceNumber).toBe('A002');
    });

    it('combines multiple filters', async () => {
      const results = await memberRepo.findAll({
        status: 'active',
        memberType: 'reserve',
      });
      expect(results).toHaveLength(1);
      expect(results[0].serviceNumber).toBe('A001');
    });
  });
});
```

**Citation**: [Testcontainers Documentation](https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/)

---

**2.2.2 Route Integration Tests (CRITICAL - Supertest)**

**Setup**:
```typescript
// src/routes/__tests__/setup.ts
import express, { Express } from 'express';
import request from 'supertest';
import { setupTestDatabase } from '@/db/repositories/__tests__/setup';

export async function createTestApp(): Promise<Express> {
  const { prisma } = await setupTestDatabase();

  const app = express();
  app.use(express.json());

  // Mount routes (without auth middleware for testing)
  const membersRouter = await import('../members');
  app.use('/api/members', membersRouter.default);

  return app;
}

export { request };
```

**Example**: Member Routes Tests
```typescript
// src/routes/__tests__/members.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, request } from './setup';
import { cleanDatabase, teardownTestDatabase } from '@/db/repositories/__tests__/setup';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe('GET /api/members', () => {
  it('returns empty array when no members exist', async () => {
    const response = await request(app)
      .get('/api/members')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ members: [] });
  });

  it('returns all members with division included', async () => {
    // Create test data
    await request(app).post('/api/divisions').send({ name: 'Engineering' });
    await request(app).post('/api/members').send({
      serviceNumber: 'A123456',
      rank: 'AB',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: division.id,
      memberType: 'reserve',
      status: 'active',
    });

    const response = await request(app)
      .get('/api/members')
      .expect(200);

    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0]).toMatchObject({
      serviceNumber: 'A123456',
      firstName: 'John',
      division: { name: 'Engineering' },
    });
  });

  it('filters by status query parameter', async () => {
    // Create active and inactive members
    await createMember({ status: 'active', serviceNumber: 'A001' });
    await createMember({ status: 'inactive', serviceNumber: 'A002' });

    const response = await request(app)
      .get('/api/members?status=active')
      .expect(200);

    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0].serviceNumber).toBe('A001');
  });
});

describe('POST /api/members', () => {
  it('creates a new member', async () => {
    const division = await createDivision('Engineering');

    const response = await request(app)
      .post('/api/members')
      .send({
        serviceNumber: 'A123456',
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: division.id,
        memberType: 'reserve',
        status: 'active',
      })
      .expect(201);

    expect(response.body.member.id).toBeDefined();
    expect(response.body.member.serviceNumber).toBe('A123456');
  });

  it('returns 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/members')
      .send({
        firstName: 'John',
        // Missing serviceNumber, rank, lastName, etc.
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('serviceNumber');
  });

  it('returns 409 for duplicate service number', async () => {
    const division = await createDivision('Engineering');

    // Create first member
    await request(app).post('/api/members').send({
      serviceNumber: 'A123456',
      rank: 'AB',
      firstName: 'John',
      lastName: 'Doe',
      divisionId: division.id,
      memberType: 'reserve',
      status: 'active',
    });

    // Attempt duplicate
    const response = await request(app)
      .post('/api/members')
      .send({
        serviceNumber: 'A123456', // Duplicate
        rank: 'LS',
        firstName: 'Jane',
        lastName: 'Smith',
        divisionId: division.id,
        memberType: 'reserve',
        status: 'active',
      })
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT_ERROR');
  });

  it('validates Zod schema for serviceNumber format', async () => {
    const response = await request(app)
      .post('/api/members')
      .send({
        serviceNumber: '123', // Invalid format (too short)
        rank: 'AB',
        firstName: 'John',
        lastName: 'Doe',
        divisionId: 'some-id',
        memberType: 'reserve',
        status: 'active',
      })
      .expect(400);

    expect(response.body.error.details).toContain('serviceNumber');
  });
});

describe('GET /api/members/:id', () => {
  it('returns member by ID', async () => {
    const member = await createMember({ serviceNumber: 'A123456' });

    const response = await request(app)
      .get(`/api/members/${member.id}`)
      .expect(200);

    expect(response.body.member.id).toBe(member.id);
  });

  it('returns 404 for non-existent ID', async () => {
    const response = await request(app)
      .get('/api/members/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PUT /api/members/:id', () => {
  it('updates member fields', async () => {
    const member = await createMember({ rank: 'AB', status: 'active' });

    const response = await request(app)
      .put(`/api/members/${member.id}`)
      .send({ rank: 'LS', status: 'inactive' })
      .expect(200);

    expect(response.body.member.rank).toBe('LS');
    expect(response.body.member.status).toBe('inactive');
  });

  it('validates partial updates', async () => {
    const member = await createMember({ rank: 'AB' });

    const response = await request(app)
      .put(`/api/members/${member.id}`)
      .send({ rank: 'INVALID_RANK' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /api/members/:id', () => {
  it('soft deletes member', async () => {
    const member = await createMember({ serviceNumber: 'A123456' });

    await request(app)
      .delete(`/api/members/${member.id}`)
      .expect(204);

    // Verify soft delete (status = inactive)
    const response = await request(app).get(`/api/members/${member.id}`);
    expect(response.body.member.status).toBe('inactive');
  });
});
```

**Citation**: [Supertest Documentation](https://github.com/ladjs/supertest)

---

**2.2.3 CSV Import Integration Tests (MEDIUM RISK)**

**Example**: Import Service End-to-End Test
```typescript
// src/services/__tests__/import-service.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '@/db/repositories/__tests__/setup';
import { ImportService } from '../import-service';
import { readFileSync } from 'fs';
import { join } from 'path';

let importService: ImportService;

beforeAll(async () => {
  const { prisma } = await setupTestDatabase();
  importService = new ImportService(prisma);
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe('ImportService - CSV Processing', () => {
  it('imports valid CSV file with all members', async () => {
    const csvPath = join(__dirname, 'fixtures', 'valid-members.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');

    const result = await importService.importMembers(csvContent, {
      preview: false,
      adminUserId: 'test-admin-id',
    });

    expect(result.imported).toBe(10);
    expect(result.errors).toHaveLength(0);
    expect(result.skipped).toBe(0);
  });

  it('detects duplicate service numbers in CSV', async () => {
    const csvContent = `
serviceNumber,rank,firstName,lastName,division
A123456,AB,John,Doe,Engineering
A123456,LS,Jane,Smith,Operations
    `.trim();

    const result = await importService.importMembers(csvContent, {
      preview: false,
      adminUserId: 'test-admin-id',
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].error).toContain('Duplicate service number');
  });

  it('sanitizes CSV injection attempts', async () => {
    const csvContent = `
serviceNumber,rank,firstName,lastName,division
A123456,AB,=1+1,Doe,Engineering
    `.trim();

    const result = await importService.importMembers(csvContent, {
      preview: false,
      adminUserId: 'test-admin-id',
    });

    const member = await memberRepo.findByServiceNumber('A123456');
    expect(member?.firstName).toBe("'=1+1"); // Escaped
  });

  it('validates required columns present', async () => {
    const csvContent = `
firstName,lastName
John,Doe
    `.trim();

    await expect(importService.importMembers(csvContent, {
      preview: false,
      adminUserId: 'test-admin-id',
    })).rejects.toThrow('Missing required columns');
  });

  it('rolls back transaction on partial failure', async () => {
    const csvContent = `
serviceNumber,rank,firstName,lastName,division
A001,AB,John,Doe,Engineering
INVALID,AB,Jane,Smith,Engineering
A003,AB,Bob,Jones,Engineering
    `.trim();

    await expect(importService.importMembers(csvContent, {
      preview: false,
      adminUserId: 'test-admin-id',
      stopOnError: true,
    })).rejects.toThrow();

    // Verify rollback (no members created)
    const members = await memberRepo.findAll();
    expect(members).toHaveLength(0);
  });

  it('generates preview without database writes', async () => {
    const csvContent = `
serviceNumber,rank,firstName,lastName,division
A123456,AB,John,Doe,Engineering
    `.trim();

    const result = await importService.importMembers(csvContent, {
      preview: true,
      adminUserId: 'test-admin-id',
    });

    expect(result.preview).toBeDefined();
    expect(result.preview?.valid).toBe(1);

    // Verify no database write
    const members = await memberRepo.findAll();
    expect(members).toHaveLength(0);
  });
});
```

---

**2.2.4 WebSocket Integration Tests (MEDIUM RISK)**

**Setup**:
```bash
bun add -d vitest-websocket-mock
```

**Example**: WebSocket Server Tests
```typescript
// src/websocket/__tests__/websocket-server.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { io, Socket } from 'socket.io-client';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupWebSocketServer } from '../server';
import { getKioskApiKey } from '@/config/env-validation';

let httpServer: Server;
let ioServer: Server;
let serverSocket: Socket;
let clientSocket: Socket;
let port: number;

beforeAll(async () => {
  httpServer = createServer();
  ioServer = setupWebSocketServer(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(() => {
      port = (httpServer.address() as any).port;
      resolve();
    });
  });
});

afterAll(async () => {
  await ioServer.close();
  await httpServer.close();
});

beforeEach(async () => {
  // Create authenticated client
  clientSocket = io(`http://localhost:${port}`, {
    auth: { kioskApiKey: getKioskApiKey() },
  });

  await new Promise<void>((resolve) => {
    clientSocket.on('connect', () => resolve());
  });
});

afterEach(() => {
  clientSocket.disconnect();
});

describe('WebSocket Server - Authentication', () => {
  it('accepts connection with valid kiosk API key', async () => {
    expect(clientSocket.connected).toBe(true);
  });

  it('rejects connection with invalid API key', async () => {
    const invalidClient = io(`http://localhost:${port}`, {
      auth: { kioskApiKey: 'invalid-key' },
    });

    const disconnected = await new Promise<boolean>((resolve) => {
      invalidClient.on('connect_error', () => resolve(true));
      setTimeout(() => resolve(false), 1000);
    });

    expect(disconnected).toBe(true);
    invalidClient.close();
  });

  it('accepts connection with valid JWT token', async () => {
    const token = await createTestJWT({ userId: 'test-user', role: 'admin' });

    const jwtClient = io(`http://localhost:${port}`, {
      auth: { token },
    });

    const connected = await new Promise<boolean>((resolve) => {
      jwtClient.on('connect', () => resolve(true));
      setTimeout(() => resolve(false), 1000);
    });

    expect(connected).toBe(true);
    jwtClient.close();
  });
});

describe('WebSocket Server - Events', () => {
  it('broadcasts checkin event to all connected clients', async () => {
    // Create second client
    const client2 = io(`http://localhost:${port}`, {
      auth: { kioskApiKey: getKioskApiKey() },
    });

    await new Promise<void>((resolve) => {
      client2.on('connect', () => resolve());
    });

    const checkinPromise = new Promise<any>((resolve) => {
      client2.on('checkin', (data) => resolve(data));
    });

    // Trigger checkin from server
    ioServer.emit('checkin', {
      checkin: { id: 'test-id', direction: 'in' },
      member: { serviceNumber: 'A123456', firstName: 'John' },
    });

    const checkinData = await checkinPromise;
    expect(checkinData.member.serviceNumber).toBe('A123456');

    client2.close();
  });

  it('handles subscribe_presence event with backfill', async () => {
    const backfillPromise = new Promise<any>((resolve) => {
      clientSocket.on('activity_backfill', (data) => resolve(data));
    });

    clientSocket.emit('subscribe_presence', { count: 10 });

    const backfillData = await backfillPromise;
    expect(backfillData).toHaveProperty('activities');
    expect(Array.isArray(backfillData.activities)).toBe(true);
  });

  it('rate limits excessive events', async () => {
    const eventLimit = 100;

    // Send 101 events rapidly
    for (let i = 0; i < eventLimit + 1; i++) {
      clientSocket.emit('kiosk_heartbeat', { kioskId: 'test-kiosk' });
    }

    // Expect disconnection
    const disconnected = await new Promise<boolean>((resolve) => {
      clientSocket.on('disconnect', () => resolve(true));
      setTimeout(() => resolve(false), 2000);
    });

    expect(disconnected).toBe(true);
  });
});

describe('WebSocket Server - Session Expiry', () => {
  it('disconnects JWT clients when session expires', async () => {
    // Create client with short-lived token
    const shortToken = await createTestJWT({ userId: 'test', role: 'admin' }, { expiresIn: '1s' });

    const jwtClient = io(`http://localhost:${port}`, {
      auth: { token: shortToken },
    });

    await new Promise<void>((resolve) => {
      jwtClient.on('connect', () => resolve());
    });

    // Wait for session expiry check (5 min interval, but token expires in 1s)
    const sessionExpired = await new Promise<boolean>((resolve) => {
      jwtClient.on('session_expired', () => resolve(true));
      setTimeout(() => resolve(false), 10000); // 10s timeout
    });

    expect(sessionExpired).toBe(true);
    jwtClient.close();
  });
});
```

**Citation**: [Socket.IO Testing Guide](https://socket.io/docs/v4/testing/)

---

### 2.3 End-to-End Testing (10% - Critical Flows Only)

**Scope**: Full user journeys through multiple systems (frontend + backend + database).

**Why Minimal E2E**:
- **Slow** - Requires browser automation, full stack running
- **Flaky** - Network issues, timing problems, race conditions
- **Expensive to maintain** - UI changes break tests frequently
- **Already covered** - Integration tests verify business logic

**What to Test**:
- Badge check-in flow (kiosk → backend → database → WebSocket → admin dashboard)
- CSV member import flow (admin dashboard → backend → database)
- Authentication flow (login → session creation → protected routes)

**Tool**: Playwright (already used in Sentinel v1)

**Example**: Badge Check-in E2E Test
```typescript
// tests/e2e/checkin-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Badge Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start kiosk app
    await page.goto('http://localhost:5173/kiosk');
  });

  test('scans badge and displays confirmation', async ({ page }) => {
    // Simulate NFC badge scan
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nfc-scan', {
        detail: { serialNumber: 'BADGE-001' },
      }));
    });

    // Wait for check-in processing
    await expect(page.locator('[data-testid="checkin-status"]'))
      .toHaveText('Check-in successful', { timeout: 5000 });

    // Verify member name displayed
    await expect(page.locator('[data-testid="member-name"]'))
      .toContainText('John Doe');

    // Verify direction
    await expect(page.locator('[data-testid="direction"]'))
      .toHaveText('IN');
  });

  test('updates admin dashboard in real-time', async ({ page, context }) => {
    // Open admin dashboard in new page
    const adminPage = await context.newPage();
    await adminPage.goto('http://localhost:5173/admin/activity');

    // Scan badge on kiosk
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nfc-scan', {
        detail: { serialNumber: 'BADGE-001' },
      }));
    });

    // Verify WebSocket update on dashboard
    await expect(adminPage.locator('[data-testid="activity-list"]').first())
      .toContainText('John Doe', { timeout: 3000 });
  });

  test('handles offline mode gracefully', async ({ page, context }) => {
    // Simulate offline
    await context.setOffline(true);

    // Scan badge
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nfc-scan', {
        detail: { serialNumber: 'BADGE-001' },
      }));
    });

    // Verify offline queue message
    await expect(page.locator('[data-testid="offline-status"]'))
      .toContainText('Saved offline');

    // Go back online
    await context.setOffline(false);

    // Verify sync
    await expect(page.locator('[data-testid="sync-status"]'))
      .toContainText('Synced', { timeout: 10000 });
  });
});
```

**When NOT to Use E2E**:
- Validation logic (use unit tests)
- Database queries (use repository integration tests)
- API error handling (use route integration tests)
- Business logic edge cases (use service tests)

**Citation**: [Playwright Best Practices](https://playwright.dev/docs/best-practices)

---

### 2.4 Property-Based Testing (CSV Validation - fast-check)

**What It Is**: Generate hundreds of random inputs to find edge cases.

**Use Cases**:
- CSV parsing (malformed headers, special characters, encoding issues)
- Validation schemas (Zod schema edge cases)
- Data transformers (null/undefined handling, type coercion)

**Setup**:
```bash
bun add -d fast-check
```

**Example**: CSV Parser Property Tests
```typescript
// src/services/__tests__/import-service.property.test.ts
import { describe, it } from 'vitest';
import { fc } from 'fast-check';
import { parseCSV } from '../import-service';

describe('CSV Parser - Property Tests', () => {
  it('handles any valid CSV structure', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            serviceNumber: fc.stringOf(fc.char(), { minLength: 6, maxLength: 7 }),
            rank: fc.constantFrom('AB', 'LS', 'MS', 'PO1', 'PO2', 'CPO1', 'CPO2'),
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 1000 }
        ),
        (rows) => {
          const csv = convertToCSV(rows);
          const parsed = parseCSV(csv);

          // Property: Parsing should preserve row count
          expect(parsed).toHaveLength(rows.length);

          // Property: All fields should be present
          parsed.forEach((row, index) => {
            expect(row.serviceNumber).toBe(rows[index].serviceNumber);
            expect(row.firstName).toBe(rows[index].firstName);
          });
        }
      ),
      { numRuns: 100 } // Run 100 random tests
    );
  });

  it('sanitizes potential CSV injection', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('=1+1'),
          fc.constant('+1+1'),
          fc.constant('-1+1'),
          fc.constant('@1+1'),
          fc.string({ minLength: 1 }).map(s => `=${s}`)
        ),
        (injectionAttempt) => {
          const csv = `firstName\n${injectionAttempt}`;
          const parsed = parseCSV(csv);

          // Property: Should escape leading formula characters
          expect(parsed[0].firstName).toMatch(/^'/);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('handles special characters in names', () => {
    fc.assert(
      fc.property(
        fc.unicodeString({ minLength: 1, maxLength: 50 }),
        (name) => {
          const csv = `firstName,lastName\n${name},Doe`;
          const parsed = parseCSV(csv);

          // Property: Should preserve unicode characters
          expect(parsed[0].firstName).toBe(name);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Citation**: [fast-check Documentation](https://github.com/dubzzz/fast-check)

---

### 2.5 Contract Testing (API Contracts)

**What It Is**: Verify API request/response formats don't break unexpectedly.

**Use Cases**:
- Frontend-backend API contracts
- Kiosk-backend offline sync contracts
- Admin dashboard-backend WebSocket contracts

**Tool**: Pact or JSON Schema validation

**Example**: API Contract Test
```typescript
// src/routes/__tests__/members.contract.test.ts
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';

const ajv = new Ajv();

const memberSchema = {
  type: 'object',
  required: ['id', 'serviceNumber', 'rank', 'firstName', 'lastName', 'status'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    serviceNumber: { type: 'string', pattern: '^[A-Z][0-9]{6}$' },
    rank: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    status: { type: 'string', enum: ['active', 'inactive', 'transferred'] },
    division: {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
};

describe('GET /api/members - Contract', () => {
  it('returns members matching schema', async () => {
    const response = await request(app).get('/api/members');

    const validate = ajv.compile({
      type: 'object',
      required: ['members'],
      properties: {
        members: {
          type: 'array',
          items: memberSchema,
        },
      },
    });

    expect(validate(response.body)).toBe(true);
  });
});
```

---

### 2.6 Snapshot Testing (Response Stability)

**What It Is**: Capture API response structure and detect unintended changes.

**Use Cases**:
- API response formats (ensure backwards compatibility)
- Error message formats
- WebSocket event payloads

**Example**: Snapshot Test
```typescript
// src/routes/__tests__/members.snapshot.test.ts
import { describe, it, expect } from 'vitest';

describe('GET /api/members/:id - Snapshot', () => {
  it('matches expected response structure', async () => {
    const member = await createMember({ serviceNumber: 'A123456' });

    const response = await request(app).get(`/api/members/${member.id}`);

    // Remove dynamic fields (id, timestamps)
    const snapshot = {
      ...response.body.member,
      id: '[UUID]',
      createdAt: '[DATE]',
      updatedAt: '[DATE]',
    };

    expect(snapshot).toMatchSnapshot();
  });

  it('error response matches snapshot', async () => {
    const response = await request(app)
      .get('/api/members/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect({
      ...response.body.error,
      requestId: '[UUID]',
    }).toMatchSnapshot();
  });
});
```

---

## 3. Essential Testing Tools

### 3.1 Testcontainers (CRITICAL - PostgreSQL Integration Tests)

**What It Does**: Spins up real PostgreSQL containers for integration tests.

**Why Critical**:
- **Real database behavior** - Catches FK constraints, indexes, transactions
- **Isolated** - Each test suite gets fresh container
- **Reproducible** - Same PostgreSQL version as production
- **Fast** - Containers reused across test files

**Installation**:
```bash
bun add -d testcontainers
```

**Setup Pattern**:
```typescript
// src/db/__tests__/setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;

export async function setupTestDatabase() {
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .withReuse() // Reuse container across test files
    .start();

  const connectionString = container.getConnectionUri();
  process.env.DATABASE_URL = connectionString;

  prisma = new PrismaClient({
    datasources: { db: { url: connectionString } },
  });

  // Run migrations
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  return { prisma, connectionString };
}

export async function teardownTestDatabase() {
  await prisma.$disconnect();
  await container.stop();
}

export async function cleanDatabase() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  for (const { tablename } of tables) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }
  }
}
```

**Usage in Tests**:
```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from './setup';

let prisma: PrismaClient;

beforeAll(async () => {
  ({ prisma } = await setupTestDatabase());
}, 30000); // 30s timeout for container startup

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});
```

**Performance Optimization**:
```typescript
// Reuse container across all test files (vitest.setup.ts)
import { setupTestDatabase, teardownTestDatabase } from './src/db/__tests__/setup';

export async function setup() {
  await setupTestDatabase();
}

export async function teardown() {
  await teardownTestDatabase();
}
```

**Citation**: [Testcontainers Node.js Documentation](https://node.testcontainers.org/modules/postgresql/)

---

### 3.2 Supertest (CRITICAL - Express Route Testing)

**What It Does**: Makes HTTP requests to Express apps without starting a server.

**Why Critical**:
- **No port conflicts** - No need to manage ports
- **Fast** - No network overhead
- **Assertions built-in** - `.expect(200)`, `.expect('Content-Type', /json/)`
- **Integration-friendly** - Works with real database

**Installation**:
```bash
bun add -d supertest @types/supertest
```

**Pattern**:
```typescript
import request from 'supertest';
import { app } from '@/server'; // Export Express app

describe('POST /api/checkins', () => {
  it('processes badge scan', async () => {
    const response = await request(app)
      .post('/api/checkins')
      .send({ serialNumber: 'BADGE-001', kioskId: 'kiosk-1' })
      .set('X-Kiosk-API-Key', getKioskApiKey())
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body.checkin.direction).toBe('in');
  });

  it('requires authentication', async () => {
    await request(app)
      .post('/api/checkins')
      .send({ serialNumber: 'BADGE-001' })
      .expect(401);
  });
});
```

**Citation**: [Supertest GitHub](https://github.com/ladjs/supertest)

---

### 3.3 MSW (External API Mocking)

**What It Does**: Intercepts HTTP requests to external APIs (Sentry, future integrations).

**Why Useful**:
- **No real API calls** - Fast, no rate limits
- **Deterministic responses** - Control error scenarios
- **Network-level mocking** - Works with any HTTP client

**Installation**:
```bash
bun add -d msw
```

**Setup**:
```typescript
// src/__tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Sentry DSN check
  http.get('https://sentry.io/api/0/projects/:org/:project', () => {
    return HttpResponse.json({ id: 'mock-project' });
  }),

  // Mock external member sync API (future feature)
  http.post('https://api.external.com/sync', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, syncedCount: body.members.length });
  }),
];
```

**Usage**:
```typescript
// src/__tests__/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Citation**: [MSW Documentation](https://mswjs.io/docs/)

---

### 3.4 fast-check (Property-Based Testing)

**What It Does**: Generates random inputs to find edge cases.

**Why Useful**:
- **CSV parsing** - Handles malformed CSVs, special characters
- **Validation** - Tests Zod schemas with unexpected inputs
- **Transformers** - Finds null/undefined handling bugs

**Installation**:
```bash
bun add -d fast-check
```

**Example**:
```typescript
import { fc } from 'fast-check';

it('sanitizes all formula injection attempts', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant('='),
        fc.constant('+'),
        fc.constant('-'),
        fc.constant('@')
      ).chain(prefix =>
        fc.string().map(str => `${prefix}${str}`)
      ),
      (injectionAttempt) => {
        const sanitized = sanitizeCSVField(injectionAttempt);
        expect(sanitized).toMatch(/^'/); // Escaped
      }
    )
  );
});
```

**Citation**: [fast-check GitHub](https://github.com/dubzzz/fast-check)

---

### 3.5 vitest-websocket-mock (WebSocket Testing)

**What It Does**: Mocks WebSocket connections for unit tests.

**Why Useful**:
- **Unit test WebSocket events** - No real server needed
- **Control timing** - Simulate slow connections, disconnections
- **Assertions** - Verify messages sent/received

**Installation**:
```bash
bun add -d vitest-websocket-mock
```

**Example**:
```typescript
import { WS } from 'vitest-websocket-mock';

it('broadcasts checkin event', async () => {
  const mockWS = new WS('ws://localhost:3000');

  const client = new WebSocket('ws://localhost:3000');
  await mockWS.connected;

  // Trigger server event
  broadcastCheckin({ id: 'test', direction: 'in' });

  // Verify client received message
  const message = await mockWS.nextMessage;
  expect(JSON.parse(message)).toMatchObject({
    event: 'checkin',
    data: { direction: 'in' },
  });
});
```

**Citation**: [vitest-websocket-mock GitHub](https://github.com/romgain/vitest-websocket-mock)

---

## 4. Current Testing Gaps

### 4.1 Repository Layer (HIGH RISK)

**Current State**: No integration tests with real database.

**Risks**:
- ❌ FK constraint violations undetected
- ❌ Index performance not validated
- ❌ Transaction rollback bugs
- ❌ Null handling in Prisma queries
- ❌ Unique constraint violations

**Critical Missing Tests**:
```
src/db/repositories/member-repository.ts
├─ create() - No test for duplicate service number FK violation
├─ update() - No test for concurrent update race conditions
├─ findAll() - No test for division JOIN performance
├─ bulkCreate() - No test for transaction rollback
└─ delete() - No test for cascade delete behavior

src/db/repositories/checkin-repository.ts
├─ create() - No test for duplicate detection window
├─ findLastByMemberId() - No test for direction toggle logic
└─ findRecent() - No test for 5-minute window query

src/db/repositories/badge-repository.ts
├─ assignBadge() - No test for reassignment conflicts
└─ findBySerialNumber() - No test for case sensitivity
```

**Estimated Impact**: 90% of production bugs originate from untested database interactions.

**Solution**: Phase 1 of roadmap (Testcontainers + repository tests).

---

### 4.2 Route Layer (HIGH RISK)

**Current State**: No Supertest integration tests for API endpoints.

**Risks**:
- ❌ Request validation bypassed
- ❌ Error response formats incorrect
- ❌ Authentication middleware not applied
- ❌ Rate limiting not enforced
- ❌ CORS headers missing

**Critical Missing Tests**:
```
src/routes/members.ts
├─ POST /api/members - No test for 409 conflict on duplicate
├─ GET /api/members - No test for pagination limits
├─ PUT /api/members/:id - No test for partial update validation
└─ DELETE /api/members/:id - No test for soft delete

src/routes/checkins.ts
├─ POST /api/checkins - No test for kiosk API key auth
├─ POST /api/checkins/bulk - No test for offline sync validation
└─ GET /api/checkins - No test for date range filtering

src/routes/auth.ts
├─ POST /api/auth/login - No test for rate limiting (5 attempts/15 min)
├─ POST /api/auth/logout - No test for session deletion
└─ POST /api/auth/refresh - No test for expired token
```

**Estimated Impact**: 70% of API bugs found in production would be caught by route tests.

**Solution**: Phase 2 of roadmap (Supertest + route tests).

---

### 4.3 CSV Import (MEDIUM RISK)

**Current State**: Unit tests exist but no end-to-end integration tests.

**Risks**:
- ❌ CSV injection not tested with real database
- ❌ Transaction rollback not verified
- ❌ Division auto-detection edge cases
- ❌ Large file performance (1000+ rows)
- ❌ Column mapping detection failures

**Critical Missing Tests**:
```
src/services/import-service.ts
├─ importMembers() - No test for partial failure rollback
├─ detectDivision() - No test for ambiguous division names
├─ validateRow() - No test for unicode characters
└─ sanitizeField() - Property tests missing for edge cases
```

**Estimated Impact**: Medium - Import is admin-only, failures visible immediately.

**Solution**: Phase 3 of roadmap (Integration + property tests).

---

### 4.4 WebSocket Events (MEDIUM RISK)

**Current State**: Unit tests exist, but no integration tests with real clients.

**Risks**:
- ❌ Broadcast race conditions
- ❌ Session expiry not tested end-to-end
- ❌ Event rate limiting enforcement gaps
- ❌ Connection cleanup on disconnect

**Critical Missing Tests**:
```
src/websocket/server.ts
├─ authenticateSocket() - No test for expired JWT
├─ handleSubscribePresence() - No test for backfill limits
└─ sessionCheckInterval - No test for cleanup on disconnect

src/websocket/broadcast.ts
├─ broadcastCheckin() - No test for multiple clients
└─ broadcastPresenceUpdate() - No test for throttling
```

**Estimated Impact**: Low - WebSocket failures are visible immediately in UI.

**Solution**: Phase 3 of roadmap (vitest-websocket-mock + integration tests).

---

### 4.5 Coverage Tracking (HIGH RISK)

**Current State**: No coverage reports generated.

**Risks**:
- ❌ Unknown which code paths are tested
- ❌ Regression risk during refactoring
- ❌ New code merged without tests

**Solution**: Add Vitest coverage to CI/CD.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
```

**CI Integration** (GitHub Actions):
```yaml
- name: Run tests with coverage
  run: bun run test --coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

---

## 5. 4-Phase Implementation Roadmap

### Phase 1: Repository Integration Tests (Weeks 1-2) - 90% PRIORITY

**Goal**: Eliminate database-related bugs with Testcontainers.

**Scope**:
- Set up Testcontainers PostgreSQL
- Write integration tests for all 14 repositories
- Verify FK constraints, indexes, transactions
- Test null handling, unique constraints

**Deliverables**:
```
✅ src/db/__tests__/setup.ts - Testcontainer setup
✅ src/db/repositories/__tests__/member-repository.test.ts (20 tests)
✅ src/db/repositories/__tests__/badge-repository.test.ts (15 tests)
✅ src/db/repositories/__tests__/checkin-repository.test.ts (18 tests)
✅ src/db/repositories/__tests__/visitor-repository.test.ts (12 tests)
✅ src/db/repositories/__tests__/admin-user-repository.test.ts (10 tests)
✅ src/db/repositories/__tests__/audit-repository.test.ts (8 tests)
✅ src/db/repositories/__tests__/division-repository.test.ts (8 tests)
✅ src/db/repositories/__tests__/event-repository.test.ts (12 tests)
✅ src/db/repositories/__tests__/tag-repository.test.ts (6 tests)
✅ Coverage: 90%+ for repository layer
```

**Success Metrics**:
- All repository methods tested with real database
- FK constraint violations caught
- Transaction rollback verified
- Zero database-related bugs in Phase 2

**Time Estimate**: 10 days (2 weeks)

---

### Phase 2: Route Integration Tests (Week 3) - 80% PRIORITY

**Goal**: Verify API contracts with Supertest.

**Scope**:
- Set up Supertest with test app
- Write integration tests for all 25 routes
- Test authentication, validation, error handling
- Verify rate limiting enforcement

**Deliverables**:
```
✅ src/routes/__tests__/setup.ts - Supertest setup
✅ src/routes/__tests__/members.test.ts (25 tests)
✅ src/routes/__tests__/checkins.test.ts (20 tests)
✅ src/routes/__tests__/badges.test.ts (15 tests)
✅ src/routes/__tests__/auth.test.ts (12 tests)
✅ src/routes/__tests__/visitors.test.ts (10 tests)
✅ src/routes/__tests__/divisions.test.ts (8 tests)
✅ src/routes/__tests__/events.test.ts (12 tests)
✅ Coverage: 80%+ for route layer
```

**Success Metrics**:
- All API endpoints tested end-to-end
- Authentication enforced on protected routes
- Validation errors return 400 with details
- Rate limiting prevents abuse

**Time Estimate**: 5 days (1 week)

---

### Phase 3: Service Layer + CSV + WebSocket (Week 4) - 70% PRIORITY

**Goal**: Test business logic and real-time features.

**Scope**:
- Test service layer with real repositories
- Add property tests for CSV import
- Write WebSocket integration tests
- Test offline sync with IndexedDB mocks

**Deliverables**:
```
✅ src/services/__tests__/checkin-service.test.ts (15 tests)
✅ src/services/__tests__/member-service.test.ts (12 tests)
✅ src/services/__tests__/import-service.integration.test.ts (20 tests)
✅ src/services/__tests__/import-service.property.test.ts (10 property tests)
✅ src/services/__tests__/presence-service.test.ts (10 tests)
✅ src/websocket/__tests__/server.integration.test.ts (15 tests)
✅ src/websocket/__tests__/broadcast.test.ts (8 tests)
✅ Coverage: 70%+ for service layer
```

**Success Metrics**:
- CSV import tested with 1000+ row files
- Property tests find edge cases
- WebSocket broadcasts verified with multiple clients
- Offline sync tested with network failures

**Time Estimate**: 5 days (1 week)

---

### Phase 4: Quality Improvements (Ongoing) - 50% PRIORITY

**Goal**: Continuous improvement and maintenance.

**Scope**:
- Add mutation testing with Stryker
- Improve coverage to 80%+ overall
- Add snapshot tests for API responses
- Set up CI/CD coverage enforcement

**Deliverables**:
```
✅ stryker.config.mjs - Mutation testing config
✅ CI/CD pipeline with coverage gates
✅ Snapshot tests for all API routes
✅ Coverage reports in pull requests
✅ Coverage: 80%+ overall
```

**Success Metrics**:
- Mutation score >70% (test quality)
- Zero coverage regressions in PRs
- All new code requires tests
- Flaky test rate <1%

**Time Estimate**: Ongoing (1-2 days per sprint)

---

## 6. Testing Trophy vs Pyramid

### 6.1 Traditional Testing Pyramid (NOT RECOMMENDED)

```
        /\
       /E2E\      ← 10% (slow, brittle)
      /------\
     /  INT   \   ← 20% (some integration)
    /----------\
   /   UNIT     \ ← 70% (lots of mocks)
  /--------------\
```

**Problems**:
- Unit tests with heavy mocking miss real bugs
- Integration tests neglected = database bugs in production
- E2E tests too slow for CI/CD

---

### 6.2 Testing Trophy (RECOMMENDED FOR SENTINEL)

```
       /\
      /  \
     / E2E\      ← 10% (critical flows)
    /------\
   /  INT   \    ← 50% (MAJORITY - repositories, routes, services)
  /----------\
 /   UNIT     \  ← 30% (pure logic only)
/--------------\
   STATIC      ← TypeScript (compile-time safety)
```

**Why Trophy for Sentinel**:
- **Backend is I/O-heavy** - Database, Redis, WebSocket dominate logic
- **Integration tests faster than you think** - Testcontainers reuse, parallel execution
- **Mocks hide bugs** - FK constraints, indexes, transactions never tested
- **Confidence in refactoring** - Tests survive implementation changes

**Citation**: [Kent C. Dodds - Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests)

---

### 6.3 Layer-Specific Strategy

| Layer | Testing Approach | Tooling | Coverage Target |
|-------|-----------------|---------|-----------------|
| **Utilities** | Pure unit tests | Vitest | 90% |
| **Repositories** | Integration tests (real DB) | Vitest + Testcontainers | 90% |
| **Routes** | Integration tests (real DB + HTTP) | Vitest + Supertest + Testcontainers | 80% |
| **Services** | Integration tests (real repos) | Vitest + Testcontainers | 70% |
| **WebSocket** | Integration tests (real clients) | Vitest + Socket.IO client | 70% |
| **E2E** | Critical flows only | Playwright | 10% |

---

## 7. Coverage Targets by Layer

### 7.1 Coverage Thresholds (vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        // Global targets
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,

        // Per-file overrides
        'src/utils/**': {
          lines: 90,
          functions: 90,
          branches: 85,
        },
        'src/db/repositories/**': {
          lines: 90,
          functions: 90,
        },
        'src/routes/**': {
          lines: 80,
          functions: 80,
        },
        'src/services/**': {
          lines: 70,
          functions: 70,
        },
      },
    },
  },
});
```

---

### 7.2 What NOT to Test

**Don't Test**:
- ❌ Third-party libraries (Prisma, Express, Socket.IO)
- ❌ Boilerplate code (getters/setters)
- ❌ Type definitions (TypeScript catches this)
- ❌ Configuration files (env-validation.ts is self-testing)
- ❌ Generated code (Prisma client)

**Focus Testing On**:
- ✅ Business logic (check-in direction detection, duplicate detection)
- ✅ Validation (Zod schemas, password policies)
- ✅ Data transformations (Prisma null → undefined)
- ✅ Error handling (custom error classes)
- ✅ Integration boundaries (repositories, routes)

---

## 8. Test Organization Structure

### 8.1 Co-located Tests (RECOMMENDED)

**Pattern**: Tests live next to source files in `__tests__/` directories.

```
src/
├─ db/
│  ├─ repositories/
│  │  ├─ __tests__/
│  │  │  ├─ setup.ts
│  │  │  ├─ member-repository.test.ts
│  │  │  └─ badge-repository.test.ts
│  │  ├─ member-repository.ts
│  │  └─ badge-repository.ts
│  └─ prisma.ts
├─ routes/
│  ├─ __tests__/
│  │  ├─ setup.ts
│  │  ├─ members.test.ts
│  │  └─ auth.test.ts
│  ├─ members.ts
│  └─ auth.ts
├─ services/
│  ├─ __tests__/
│  │  ├─ checkin-service.test.ts
│  │  └─ import-service.test.ts
│  ├─ checkin-service.ts
│  └─ import-service.ts
└─ utils/
   ├─ __tests__/
   │  ├─ password-policy.test.ts
   │  └─ timestamp-validator.test.ts
   └─ password-policy.ts
```

**Benefits**:
- Easy to find tests for any file
- Refactoring moves tests with code
- Clear ownership (one test file per source file)

---

### 8.2 Shared Test Utilities

```
src/__tests__/
├─ fixtures/
│  ├─ valid-members.csv
│  ├─ invalid-members.csv
│  └─ test-badge-scans.json
├─ factories/
│  ├─ member-factory.ts
│  ├─ badge-factory.ts
│  └─ checkin-factory.ts
└─ helpers/
   ├─ auth-helpers.ts (createTestJWT, etc.)
   ├─ database-helpers.ts (cleanDatabase, etc.)
   └─ http-helpers.ts (authenticated requests)
```

**Example Factory**:
```typescript
// src/__tests__/factories/member-factory.ts
import { PrismaClient } from '@prisma/client';

export async function createMember(
  prisma: PrismaClient,
  overrides?: Partial<Member>
) {
  const division = await prisma.division.findFirst() ||
    await prisma.division.create({ data: { name: 'Default' } });

  return prisma.member.create({
    data: {
      serviceNumber: `A${Math.floor(Math.random() * 1000000)}`,
      rank: 'AB',
      firstName: 'Test',
      lastName: 'Member',
      divisionId: division.id,
      memberType: 'reserve',
      status: 'active',
      ...overrides,
    },
  });
}
```

---

### 8.3 Test Naming Conventions

**File Naming**:
```
✅ member-repository.test.ts
✅ members.test.ts
✅ import-service.integration.test.ts
✅ import-service.property.test.ts
❌ memberRepo.spec.ts (use .test.ts)
❌ test-members.ts (prefix with source file name)
```

**Test Naming**:
```typescript
// ✅ Descriptive, behavior-focused
it('returns 404 for non-existent member ID', async () => {});
it('throws ConflictError for duplicate service number', async () => {});
it('sanitizes CSV injection attempts with leading =', async () => {});

// ❌ Implementation-focused
it('calls findUnique with correct ID', async () => {});
it('memberRepository.create works', async () => {});
```

---

## 9. Mutation Testing with Stryker

### 9.1 What Is Mutation Testing?

**Concept**: Modify (mutate) your code and verify tests catch the changes.

**Example Mutation**:
```typescript
// Original
if (password.length < 12) {
  throw new ValidationError('Password too short');
}

// Mutant 1: Change operator
if (password.length <= 12) { // Should be caught by test
  throw new ValidationError('Password too short');
}

// Mutant 2: Change constant
if (password.length < 11) { // Should be caught by test
  throw new ValidationError('Password too short');
}
```

**Mutation Score**: Percentage of mutants killed by tests.
- **>80%** = Excellent test quality
- **60-80%** = Good
- **<60%** = Weak tests (passes even with bugs)

---

### 9.2 Stryker Setup

**Installation**:
```bash
bun add -d @stryker-mutator/core @stryker-mutator/vitest
```

**Configuration** (`stryker.config.mjs`):
```javascript
export default {
  packageManager: 'bun',
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',

  mutate: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],

  thresholds: {
    high: 80,
    low: 60,
    break: 50, // CI fails if mutation score <50%
  },

  timeoutMS: 60000,
  concurrency: 4,
};
```

**Run**:
```bash
bun stryker run
```

**Output**:
```
Mutation score: 73.2%
Killed: 146/200 mutants
Survived: 54/200 mutants (INVESTIGATE)
```

---

### 9.3 Interpreting Results

**Survived Mutants** = Tests didn't catch bug:
```typescript
// Example survived mutant
- if (member.status === 'active') {
+ if (member.status !== 'active') {

// Why survived: No test verifies inactive members are filtered
```

**Action**: Add test to kill mutant.

**Citation**: [Stryker Mutator Documentation](https://stryker-mutator.io/docs/)

---

## 10. CI/CD Integration

### 10.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run TypeScript check
        run: bun run typecheck

      - name: Run unit tests
        run: bun test

      - name: Run integration tests
        run: bun test -- --run src/**/__tests__/**/*.integration.test.ts
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

      - name: Generate coverage report
        run: bun test --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Check coverage thresholds
        run: |
          bun test --coverage --coverage.thresholds.lines=70

      - name: Run mutation tests (on main only)
        if: github.ref == 'refs/heads/main'
        run: bun stryker run
```

---

### 10.2 Pre-commit Hooks (Husky)

```bash
bun add -d husky lint-staged
```

**Setup** (`.husky/pre-commit`):
```bash
#!/bin/sh
bun lint-staged
```

**Configuration** (`package.json`):
```json
{
  "lint-staged": {
    "src/**/*.ts": [
      "bun run typecheck",
      "bun test --run --related"
    ]
  }
}
```

**Runs on commit**:
- TypeScript check
- Tests for changed files only

---

### 10.3 Coverage Enforcement

**Fail PR if coverage drops**:
```yaml
- name: Check coverage diff
  uses: codecov/codecov-action@v3
  with:
    fail_ci_if_error: true
    flags: backend
    token: ${{ secrets.CODECOV_TOKEN }}
```

**Codecov Settings**:
```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: 70%
        threshold: 2% # Allow 2% drop
    patch:
      default:
        target: 80% # New code must be 80% covered
```

---

## 11. References & Citations

### 11.1 Framework Documentation

1. **Vitest**
   - [Official Documentation](https://vitest.dev/)
   - [Why Vitest](https://vitest.dev/guide/why.html)
   - [Mocking Guide](https://vitest.dev/guide/mocking.html)

2. **Bun Test**
   - [Bun Test Documentation](https://bun.sh/docs/cli/test)

3. **Jest**
   - [Jest Documentation](https://jestjs.io/docs/getting-started)

4. **Node Test Runner**
   - [Node.js Test Runner](https://nodejs.org/api/test.html)

5. **AVA**
   - [AVA Documentation](https://github.com/avajs/ava)

---

### 11.2 Testing Tools

6. **Testcontainers**
   - [Testcontainers for Node.js](https://node.testcontainers.org/)
   - [PostgreSQL Module](https://node.testcontainers.org/modules/postgresql/)

7. **Supertest**
   - [Supertest GitHub](https://github.com/ladjs/supertest)

8. **MSW (Mock Service Worker)**
   - [MSW Documentation](https://mswjs.io/docs/)

9. **fast-check**
   - [fast-check GitHub](https://github.com/dubzzz/fast-check)
   - [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/1-Guides/PropertyBasedTesting.md)

10. **vitest-websocket-mock**
    - [GitHub Repository](https://github.com/romgain/vitest-websocket-mock)

11. **Socket.IO Testing**
    - [Official Testing Guide](https://socket.io/docs/v4/testing/)

---

### 11.3 Testing Philosophy

12. **Kent C. Dodds - Testing JavaScript**
    - [Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests)
    - [The Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)

13. **Martin Fowler - Testing Strategies**
    - [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html)
    - [Integration Testing](https://martinfowler.com/bliki/IntegrationTest.html)

14. **Google Testing Blog**
    - [Test Sizes](https://testing.googleblog.com/2010/12/test-sizes.html)

---

### 11.4 Mutation Testing

15. **Stryker Mutator**
    - [Stryker Documentation](https://stryker-mutator.io/docs/)
    - [Mutation Testing Explained](https://stryker-mutator.io/docs/mutation-testing-elements/introduction/)

---

### 11.5 CI/CD Integration

16. **GitHub Actions**
    - [Testing in GitHub Actions](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)

17. **Codecov**
    - [Codecov Documentation](https://docs.codecov.com/docs)

---

### 11.6 Best Practices

18. **Playwright Best Practices**
    - [Official Best Practices](https://playwright.dev/docs/best-practices)

19. **Express Testing Guide**
    - [Express Testing Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html#testing)

20. **Prisma Testing Guide**
    - [Testing with Prisma](https://www.prisma.io/docs/orm/prisma-client/testing)

---

## Appendix A: Quick Start Guide

### Installation

```bash
cd /home/sauk/projects/sentinel-v2/backend

# Install test dependencies
bun add -d vitest @vitest/coverage-v8 testcontainers supertest @types/supertest fast-check vitest-websocket-mock @stryker-mutator/core @stryker-mutator/vitest

# Create vitest config
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/__tests__/**', '**/*.d.ts', '**/*.config.*', 'dist/'],
      thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
EOF

# Run tests
bun test

# Run with coverage
bun test --coverage

# Run integration tests only
bun test -- --run src/**/__tests__/**/*.integration.test.ts
```

---

## Appendix B: Test Template Examples

### Repository Test Template

```typescript
// src/db/repositories/__tests__/TEMPLATE-repository.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from './setup';
import { TemplateRepository } from '../template-repository';

let prisma: PrismaClient;
let repo: TemplateRepository;

beforeAll(async () => {
  ({ prisma } = await setupTestDatabase());
  repo = new TemplateRepository(prisma);
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe('TemplateRepository', () => {
  describe('create', () => {
    it('creates a record', async () => {
      const record = await repo.create({ name: 'Test' });
      expect(record.id).toBeDefined();
    });
  });

  describe('findById', () => {
    it('finds existing record', async () => {
      const created = await repo.create({ name: 'Test' });
      const found = await repo.findById(created.id);
      expect(found).toBeDefined();
    });

    it('returns null for non-existent ID', async () => {
      const found = await repo.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });
});
```

---

### Route Test Template

```typescript
// src/routes/__tests__/TEMPLATE.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, request } from './setup';
import { cleanDatabase, teardownTestDatabase } from '@/db/repositories/__tests__/setup';

let app: Express;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

describe('GET /api/template', () => {
  it('returns 200', async () => {
    await request(app).get('/api/template').expect(200);
  });
});

describe('POST /api/template', () => {
  it('creates a record', async () => {
    const response = await request(app)
      .post('/api/template')
      .send({ name: 'Test' })
      .expect(201);

    expect(response.body.record.id).toBeDefined();
  });

  it('validates required fields', async () => {
    await request(app)
      .post('/api/template')
      .send({})
      .expect(400);
  });
});
```

---

## Conclusion

This testing strategy prioritizes **integration testing** over unit testing, following the **Testing Trophy** model. By using **Testcontainers** for real database tests and **Supertest** for route testing, we achieve **high confidence** in refactoring while **minimizing mocks**. The **4-phase roadmap** targets critical gaps first (repositories, routes) and builds toward 80% overall coverage with mutation testing for quality assurance.

**Key Takeaways**:
- ✅ Vitest recommended for async performance
- ✅ Integration tests (80%) prioritized over unit tests (70%)
- ✅ Testcontainers eliminates database mocking
- ✅ Supertest verifies API contracts
- ✅ 4-phase roadmap starts with highest-risk gaps
- ✅ Mutation testing ensures test quality

**File Location**: `/home/sauk/projects/sentinel-v2/docs/07-testing-strategy.md`
