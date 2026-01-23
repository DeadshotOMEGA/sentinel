---
paths:
  - '**/middleware/**'
  - '**/routes/**'
  - '**/lib/auth.ts'
---

# Auth & Security

Use better-auth for authentication, API key management for kiosks/readers, OWASP best practices.

## Authentication Strategy

**3 Client Types, 3 Auth Methods**:

| Client          | Auth Method  | Use Case                                  |
| --------------- | ------------ | ----------------------------------------- |
| Admin Web Panel | JWT Sessions | Email/password login, 7-day expiry        |
| Kiosk Displays  | API Keys     | Long-lived, rotatable, offline-capable    |
| RFID Readers    | API Keys     | Machine-to-machine, event publishing only |

## better-auth Configuration

**Required setup**:

```typescript
export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  plugins: [apiKey({ prefix: 'sk_', expiresIn: 60 * 60 * 24 * 365 })],
})
```

**Password Requirements**: Min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special (better-auth validates)

## API Key Management

**Creating API Keys** (admin interface only):

```typescript
const rawKey = crypto.randomBytes(32).toString('base64url')
const fullKey = `sk_${rawKey}`
const apiKey = await auth.api.createApiKey({
  key: fullKey,
  name: params.name,
  permissions: params.permissions,
})
// ⚠️ Return key ONCE to user (never stored plain text)
```

**Rotation** (required every 12 months):

```typescript
// 1. Create new key with same permissions
// 2. Expire old key (soft delete for audit trail)
await prisma.apiKey.update({
  where: { id: keyId },
  data: { expiresAt: new Date() },
})
```

**Permissions** (least privilege):

- Kiosk: `['read:attendance', 'read:personnel']` (display only)
- Reader: `['write:attendance']` (publish events only)
- Admin: `['admin:*']` (full access)

## Middleware Patterns

**JWT Session Auth**:

```typescript
export async function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.session_token
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const session = await auth.api.verifyToken({ token })
  if (!session) return res.status(401).json({ error: 'Invalid session' })

  req.user = session.user
  next()
}
```

**API Key Auth**:

```typescript
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string
  if (!apiKey) return res.status(401).json({ error: 'API key required' })

  const keyData = await auth.api.verifyApiKey({ key: apiKey })
  if (!keyData?.valid) return res.status(401).json({ error: 'Invalid API key' })

  req.apiKey = keyData
  next()
}
```

**Permission Check**:

```typescript
function requirePermission(permission: string) {
  return (req, res, next) => {
    const permissions = req.apiKey?.permissions || []
    if (!permissions.includes(permission) && !permissions.includes('admin:*')) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
```

## Rate Limiting

**Login Attempts**:

```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // 5 attempts per IP
})
app.post('/api/auth/login', loginLimiter, loginHandler)
```

**API Endpoints**:

```typescript
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 100, // 100 requests per min per key
  keyGenerator: (req) => req.apiKey?.id || req.ip,
})
app.use('/api/*', apiKeyAuth, apiLimiter)
```

**RFID Readers** (Socket.IO):

```typescript
// Min 500ms between scans per reader
const readerLimiter = new Map<string, number>()
io.use((socket, next) => {
  if (socket.data.clientType === 'READER') {
    const now = Date.now()
    const lastScan = readerLimiter.get(readerId) || 0
    if (now - lastScan < 500) return next(new Error('Rate limit exceeded'))
    readerLimiter.set(readerId, now)
  }
  next()
})
```

## Security Headers

**Helmet + CORS**:

```typescript
app.use(helmet())
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'wss://'], // Socket.IO
    },
  })
)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
)
```

**HTTPS Enforcement** (production):

```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`)
    }
    next()
  })
}
```

## Secrets Management

**Environment Variables** (`.env.local`, gitignored):

```bash
JWT_SECRET=<openssl rand -base64 32>
API_KEY_SECRET=<openssl rand -base64 32>
SOCKET_IO_SECRET=<openssl rand -base64 32>
```

⚠️ **CRITICAL**: Never hardcode secrets in code. Always use environment variables.

## Common Mistakes

### ❌ Don't Store Passwords in Plain Text

**Bad**: `prisma.user.create({ password: 'SecurePass123!' })`
**Good**: `auth.api.signUp({ password: '...' })` (better-auth hashes with bcrypt)

### ❌ Don't Expose Sensitive Data

**Bad**: `res.json({ user: { ...user, password: user.password } })`
**Good**: `res.json({ user: { id: user.id, email: user.email } })`

### ❌ Don't Use Weak Secrets

**Bad**: `JWT_SECRET=secret123`
**Good**: `JWT_SECRET=<256+ bit random>` (use `openssl rand -base64 32`)

## OWASP Top 10 Compliance

| Vulnerability             | Mitigation                                                |
| ------------------------- | --------------------------------------------------------- |
| Broken Access Control     | API key permissions, JWT sessions, middleware checks      |
| Cryptographic Failures    | bcrypt passwords, HTTPS enforcement, secure secrets       |
| Injection                 | Prisma/Kysely (parameterized queries), Valibot validation |
| Security Misconfiguration | Helmet headers, CORS, CSP                                 |
| ID & Auth Failures        | Rate limiting, better-auth, strong secrets (256+ bit)     |

## Deployment Checklist

Before production:

- [ ] Passwords hashed with bcrypt (via better-auth)
- [ ] JWT secret is 256+ bits random
- [ ] API keys rotate every 12 months
- [ ] Rate limiting configured (login + API)
- [ ] Security headers (Helmet, CORS, CSP)
- [ ] HTTPS enforced
- [ ] Auth events logged for audit trail
- [ ] No secrets in code (all in env vars)
- [ ] API key permissions follow least privilege
- [ ] Password requirements enforced (12+ chars, complexity)

## Full Guide

**See**: `@docs/guides/auth-security-guide.md` for comprehensive implementation patterns and OWASP compliance details.
