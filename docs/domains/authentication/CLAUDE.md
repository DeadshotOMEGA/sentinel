# Authentication Domain Documentation (AI-First Guide)

**Purpose:** Authentication, sessions, and API key documentation

**AI Context Priority:** high

**When to Load:** User working on auth, login, sessions, API keys, better-auth

**Triggers:** auth, authentication, login, logout, session, api-key, better-auth, jwt

---

## Quick Reference

### What's Here

Documentation for Sentinel's authentication system:
- User authentication (email/password)
- Session management (7-day sessions)
- API key system (for kiosks)
- better-auth integration
- Security patterns

### When to Create Docs Here

**Create authentication docs when:**
- Implementing login/logout flows
- Adding new auth methods
- Documenting auth API endpoints
- Explaining auth architecture
- Writing auth security guides
- Recording auth decisions

**File naming pattern:**
- Explanation: `explanation-auth-[topic].md`
- Reference: `reference-auth-[subject].md`
- How-to: `howto-[auth-task].md`

**Examples:**
- `explanation-auth-architecture.md` - Why better-auth, how sessions work
- `reference-auth-api.md` - Auth endpoints specification
- `howto-implement-login.md` - Step-by-step login implementation
- `howto-manage-api-keys.md` - API key creation and rotation

---

## Authentication Architecture (Quick)

### System Overview

**Components:**
- **better-auth** - Authentication library with built-in API key plugin
- **Session storage** - Database-backed (Prisma)
- **Middleware** - JWT + API key validation
- **Admin users** - Email/password authentication
- **Kiosk clients** - API key authentication

**Flow:**
```
Admin → Login (email/password) → JWT token → Session (7 days)
Kiosk → API key (long-lived) → Validated on each request
```

### Key Design Decisions

**Why better-auth:**
- Built-in API key support (needed for kiosks)
- Database adapter for Prisma
- Type-safe
- Active maintenance

**See:** [ADR-0002: better-auth Adoption](../../decisions/adr/0002-better-auth-adoption.md) (to be created)

**Session duration:**
- Admin sessions: 7 days
- API keys: 1 year (configurable)
- Rationale: Balance security vs. usability

**Authentication types:**
- JWT for admin web interface
- API keys for kiosk terminals
- No social auth (internal system)

---

## Domain Structure

### Authentication Documents

**Explanation docs** (why/how it works):
- `explanation-auth-architecture.md` - Overall auth system design
- `explanation-session-management.md` - How sessions work
- `explanation-api-key-security.md` - API key security model

**Reference docs** (specifications):
- `reference-auth-api.md` - Auth endpoints (login, logout, refresh)
- `reference-api-key-api.md` - API key management endpoints
- `reference-auth-middleware.md` - Middleware configuration

**How-to docs** (tasks):
- `howto-implement-login.md` - Implement login flow
- `howto-create-api-key.md` - Generate API key for kiosk
- `howto-rotate-keys.md` - Rotate compromised keys
- `howto-test-auth.md` - Write auth tests

---

## File Naming

### Pattern

Use type prefix for clarity (multiple types in same directory):

**Format:** `[type]-[topic].md`

**Explanation:**
- `explanation-auth-architecture.md`
- `explanation-session-management.md`

**Reference:**
- `reference-auth-api.md`
- `reference-api-key-api.md`

**How-to:**
- `howto-implement-login.md`
- `howto-manage-api-keys.md`

**Why prefix required:** Multiple document types coexist in domain directories

---

## Frontmatter Requirements

### Standard Auth Document

```yaml
---
type: explanation | reference | howto
title: "Document Title"
status: draft | review | published | deprecated
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
ai:
  priority: high                    # Auth is core functionality
  context_load: on-demand            # Load when working on auth
  triggers:
    - authentication
    - login
    - session
    - api-key
  token_budget: 800
---
```

### Domain-Specific Metadata

**For security-sensitive docs:**
```yaml
security:
  sensitivity: high | medium | low
  contains_secrets: false            # Never commit secrets
  requires_review: true              # Security team review
```

**For API docs:**
```yaml
api:
  version: "1.0"
  stability: stable | beta | alpha
  deprecated: false
```

---

## Writing Auth Documentation

### Security Considerations

**Always include:**
- Security implications of approaches
- What NOT to do (anti-patterns)
- Example of secure implementation
- Link to security audit requirements

**Example:**
```markdown
## Security Considerations

**✅ Do:**
- Hash passwords with bcrypt (built into better-auth)
- Use HTTPS for all auth endpoints
- Implement rate limiting on login
- Log auth failures for monitoring

**❌ Don't:**
- Store passwords in plaintext
- Use weak session secrets
- Skip CSRF protection
- Expose API keys in logs
```

### Code Examples

**Use real auth code:**
```typescript
// apps/backend/src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { apiKey } from 'better-auth/plugins/api-key'

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 60 * 24 * 7 }, // 7 days
  plugins: [
    apiKey({
      prefix: 'sk_',
      expiresIn: 60 * 60 * 24 * 365, // 1 year
    }),
  ],
})
```

**Link to actual implementation:**
```markdown
See: [apps/backend/src/lib/auth.ts](../../../apps/backend/src/lib/auth.ts)
```

### API Reference Format

**Use consistent structure:**

```markdown
### POST /api/auth/login

**Description:** Authenticate user with email and password

**Request:**
```typescript
{
  email: string
  password: string
}
```

**Response (200 OK):**
```typescript
{
  token: string
  user: {
    id: string
    email: string
  }
}
```

**Errors:**
- `400` - Invalid credentials
- `429` - Rate limit exceeded
- `500` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"..."}'
```
```

---

## Examples

### Good Auth Documentation

**✅ Explanation doc:**
```yaml
---
type: explanation
title: "Authentication Architecture"
ai:
  triggers: [auth, architecture, better-auth, design]
---

# Authentication Architecture

## Context

Sentinel requires two authentication methods:
1. Admin users (web interface) - Email/password
2. Kiosk terminals (automated) - API keys

## Design

We chose better-auth because...
[Detailed rationale]

## How It Works

[Step-by-step flow diagrams]

## Security Model

[Threat model, mitigations]

## Trade-offs

**Benefits:**
- Single auth library
- Built-in API key support

**Drawbacks:**
- Learning curve
- Migration from old JWT

## Related

- [Auth API Reference](reference-auth-api.md)
- [How to Implement Login](howto-implement-login.md)
```

**✅ Reference doc:**
```yaml
---
type: reference
title: "Authentication API Reference"
ai:
  triggers: [auth, api, endpoints, login]
---

# Authentication API Reference

## Endpoints

### POST /api/auth/login
[Complete specification]

### POST /api/auth/logout
[Complete specification]

### POST /api/auth/refresh
[Complete specification]

## Error Codes
[All possible errors]

## Rate Limiting
[Rate limit specifications]
```

**✅ How-to doc:**
```yaml
---
type: howto
title: "How to Implement Login"
ai:
  triggers: [login, implement, auth, howto]
---

# How to Implement Login

**Goal:** Add login functionality to new route

**Assumes:** better-auth configured, middleware set up

## Steps

1. Create login route
```typescript
// apps/backend/src/routes/auth.ts
```

2. Add middleware
[Specific code]

3. Test login flow
[Test examples]

## Verification

```bash
curl -X POST ...
# Expected: 200 OK with token
```

## Related

- [Auth Architecture](explanation-auth-architecture.md)
- [Auth API Reference](reference-auth-api.md)
```

---

## Anti-Patterns

### ❌ Mixing Doc Types

```markdown
---
type: reference
title: "Auth API Reference"
---

# Tutorial: Learning Authentication

First, let's understand what auth is...
[Tutorial content mixed with reference tables]
```

**Fix:** Split into:
- `explanation-auth-concepts.md` (explanation)
- `reference-auth-api.md` (reference)

### ❌ Incomplete Security Info

```markdown
# How to Create API Keys

Just run:
```bash
npm run create-key
```
```

**Fix:** Include security context:
```markdown
# How to Create API Keys

## Security Considerations

API keys grant full access. Protect them like passwords:
- Never commit to git
- Rotate regularly
- Scope to minimum permissions

## Steps

[Implementation with security notes at each step]
```

### ❌ Outdated Examples

```markdown
# Auth with old JWT system

[Code for system we replaced 6 months ago]
```

**Fix:**
- Update to current system (better-auth)
- OR mark as deprecated
- OR archive

### ❌ Missing Cross-References

```markdown
# Auth Architecture

[Long explanation with no links to related docs]
```

**Fix:** Add related docs:
```markdown
## Related

- [Auth API Reference](reference-auth-api.md)
- [How to Implement Login](howto-implement-login.md)
- [ADR: Why better-auth](../../decisions/adr/0002-better-auth.md)
```

---

## Testing Auth Features

### Required Test Coverage

**Authentication endpoints:**
- ✅ Valid credentials → 200 with token
- ✅ Invalid credentials → 401
- ✅ Missing fields → 400
- ✅ Rate limit → 429
- ✅ Session expiry → 401 after 7 days

**API key validation:**
- ✅ Valid key → Request succeeds
- ✅ Invalid key → 401
- ✅ Expired key → 401
- ✅ Revoked key → 401
- ✅ Missing key → 401

**Middleware:**
- ✅ JWT token validated correctly
- ✅ API key validated correctly
- ✅ Both fail appropriately
- ✅ Protected routes blocked without auth

**See:** [Testing Strategy](../../cross-cutting/testing/explanation-integration-first.md)

---

## Related Code Locations

**Auth implementation:**
- [apps/backend/src/lib/auth.ts](../../../apps/backend/src/lib/auth.ts) - better-auth config
- [apps/backend/src/middleware/auth.ts](../../../apps/backend/src/middleware/auth.ts) - Auth middleware
- [apps/backend/src/routes/auth.ts](../../../apps/backend/src/routes/auth.ts) - Auth routes

**Tests:**
- [apps/backend/tests/integration/routes/auth.test.ts](../../../apps/backend/tests/integration/routes/auth.test.ts)

**Database:**
- [packages/database/prisma/schema.prisma](../../../packages/database/prisma/schema.prisma) - Auth tables (better-auth adds automatically)

---

## Related Documentation

**Cross-cutting concerns:**
- [Security](../../cross-cutting/security/CLAUDE.md) (to be created)
- [Testing](../../cross-cutting/testing/CLAUDE.md) (to be created)

**Decisions:**
- [ADR-0002: better-auth Adoption](../../decisions/adr/0002-better-auth-adoption.md) (to be created)

**Implementation:**
- [Backend Rebuild Plan](../../plans/active/backend-rebuild-plan.md) - Phase 2.1

**Guides:**
- [How-to Guides](../../guides/howto/CLAUDE.md)
- [Reference Docs](../../guides/reference/CLAUDE.md)

---

## Document Status

Current authentication docs:

- [ ] `explanation-auth-architecture.md` - To be written
- [ ] `reference-auth-api.md` - To be written
- [ ] `howto-implement-login.md` - To be written
- [ ] `howto-manage-api-keys.md` - To be written

**Priority:** High (Phase 2 of backend rebuild)

**Timeline:** Week 3 of rebuild plan

---

**Last Updated:** 2026-01-19
