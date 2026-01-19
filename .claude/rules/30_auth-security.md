# Auth & Security

Apply to: All authentication, authorization, and security-related code in Sentinel

## Rule

Use better-auth for authentication, implement API key management for kiosks/readers, and follow OWASP security best practices.

## When This Applies

- Implementing login/logout
- Creating API endpoints
- Managing API keys for kiosks/readers
- Handling sessions
- Rate limiting
- Security headers

## Authentication Strategy

### 3 Client Types, 3 Auth Methods

| Client Type | Auth Method | Use Case |
|-------------|-------------|----------|
| **Admin Web Panel** | JWT Sessions | Email/password login, 7-day expiry |
| **Kiosk Displays** | API Keys | Long-lived, rotatable, offline-capable |
| **RFID Readers** | API Keys | Machine-to-machine, event publishing only |

## better-auth Configuration

### Required Features

```typescript
import { betterAuth } from 'better-auth'
import { apiKey } from 'better-auth/plugins/api-key'

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh if older than 1 day
  },
  plugins: [
    apiKey({
      prefix: 'sk_',
      expiresIn: 60 * 60 * 24 * 365, // 1 year (rotatable)
    }),
  ],
})
```

### Password Requirements

- Minimum 12 characters
- At least 1 uppercase, 1 lowercase, 1 number, 1 special character
- Not in common password list (better-auth validates by default)

## API Key Management

### Creating API Keys

```typescript
// ONLY create API keys via admin interface (not programmatically)
async function createApiKey(params: {
  name: string
  deviceType: 'KIOSK' | 'READER'
  permissions: string[]
  expiresIn?: number
}) {
  const rawKey = crypto.randomBytes(32).toString('base64url')
  const fullKey = `sk_${rawKey}`

  const apiKey = await auth.api.createApiKey({
    key: fullKey,
    name: params.name,
    permissions: params.permissions,
    expiresAt: params.expiresIn
      ? new Date(Date.now() + params.expiresIn * 1000)
      : undefined,
  })

  // CRITICAL: Return key ONCE to user (never stored in plain text)
  return {
    id: apiKey.id,
    key: fullKey, // Only shown once!
    name: params.name,
  }
}
```

### API Key Rotation

**Required**: Rotate kiosk/reader API keys every 12 months.

```typescript
async function rotateApiKey(keyId: string) {
  const oldKey = await prisma.apiKey.findUnique({ where: { id: keyId } })
  if (!oldKey) throw new Error('API key not found')

  // Create new key with same permissions
  const newKey = await createApiKey({
    name: oldKey.name,
    deviceType: oldKey.deviceType,
    permissions: oldKey.permissions,
  })

  // Soft delete old key (keep for audit trail)
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { expiresAt: new Date() }, // Expire immediately
  })

  return newKey
}
```

### API Key Permissions

**Granular permissions** (following principle of least privilege):

| Permission | Allowed Actions |
|------------|----------------|
| `read:attendance` | GET /api/attendance/* |
| `write:attendance` | POST /api/attendance/check-in, check-out |
| `read:personnel` | GET /api/personnel/* |
| `write:personnel` | POST/PUT/DELETE /api/personnel/* |
| `admin:*` | All actions |

**Example**:
- Kiosk: `['read:attendance', 'read:personnel']` (display only)
- Reader: `['write:attendance']` (publish events only)
- Admin: `['admin:*']` (full access)

## Authentication Middleware

### JWT Session Auth (Admin)

```typescript
import { auth } from '@/lib/auth'
import { Request, Response, NextFunction } from 'express'

export async function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.session_token

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const session = await auth.api.verifyToken({ token })

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    req.user = session.user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

// Usage
app.get('/api/admin/dashboard', jwtAuth, dashboardHandler)
```

### API Key Auth (Kiosks/Readers)

```typescript
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' })
  }

  try {
    const keyData = await auth.api.verifyApiKey({ key: apiKey })

    if (!keyData || !keyData.valid) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    req.apiKey = keyData
    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

// Usage
app.get('/api/attendance/today', apiKeyAuth, attendanceTodayHandler)
```

### Permission Checking Middleware

```typescript
function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const permissions = req.apiKey?.permissions || []

    if (!permissions.includes(permission) && !permissions.includes('admin:*')) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    next()
  }
}

// Usage
app.post('/api/personnel', apiKeyAuth, requirePermission('write:personnel'), createPersonnelHandler)
```

## Rate Limiting

### Login Attempts

```typescript
import rateLimit from 'express-rate-limit'

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Rate limit exceeded' })
  },
})

// Usage
app.post('/api/auth/login', loginLimiter, loginHandler)
```

### API Endpoints

```typescript
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per key
  keyGenerator: (req) => req.apiKey?.id || req.ip,
})

// Usage
app.use('/api/*', apiKeyAuth, apiLimiter)
```

### RFID Scan Events (Socket.IO)

```typescript
// Per-reader rate limit (prevent spam)
const readerLimiter = new Map<string, number>()

io.use((socket, next) => {
  if (socket.data.clientType === 'READER') {
    const readerId = socket.data.apiKey.name
    const now = Date.now()
    const lastScan = readerLimiter.get(readerId) || 0

    // Min 500ms between scans
    if (now - lastScan < 500) {
      return next(new Error('Rate limit exceeded'))
    }

    readerLimiter.set(readerId, now)
  }

  next()
})
```

## Security Headers

### Helmet Configuration

```typescript
import helmet from 'helmet'

app.use(helmet())
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for styled-components
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss://'], // For Socket.IO
    },
  })
)
```

### CORS Configuration

```typescript
import cors from 'cors'

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
)
```

## HTTPS Enforcement

```typescript
// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`)
    }
    next()
  })
}
```

## Auth Event Logging

**Required**: Log all authentication events for audit trail.

```typescript
async function logAuthEvent(event: {
  type: 'LOGIN' | 'LOGOUT' | 'API_KEY_CREATED' | 'API_KEY_ROTATED' | 'FAILED_LOGIN'
  userId?: string
  apiKeyId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}) {
  await prisma.authLog.create({
    data: {
      type: event.type,
      userId: event.userId,
      apiKeyId: event.apiKeyId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata,
      timestamp: new Date(),
    },
  })
}

// Usage in login handler
await logAuthEvent({
  type: 'LOGIN',
  userId: session.user.id,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
})
```

## Secrets Management

### Environment Variables

```bash
# .env.local (NEVER commit)
DATABASE_URL=postgresql://...
JWT_SECRET=<generate with: openssl rand -base64 32>
API_KEY_SECRET=<generate with: openssl rand -base64 32>
SOCKET_IO_SECRET=<generate with: openssl rand -base64 32>
```

### Generating Secrets

```bash
# Generate secure random secrets
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**CRITICAL**: Never hardcode secrets in code. Always use environment variables.

## Common Security Mistakes

### ❌ Don't Store Passwords in Plain Text

**Bad**:
```typescript
await prisma.user.create({
  data: {
    email: 'user@example.com',
    password: 'SecurePass123!', // ❌ Plain text!
  },
})
```

**Good**:
```typescript
// better-auth handles hashing automatically
await auth.api.signUp({
  email: 'user@example.com',
  password: 'SecurePass123!', // ✅ Hashed with bcrypt
})
```

### ❌ Don't Expose Sensitive Data in Responses

**Bad**:
```typescript
res.json({
  user: {
    id: user.id,
    email: user.email,
    password: user.password, // ❌ Leaked!
  },
})
```

**Good**:
```typescript
res.json({
  user: {
    id: user.id,
    email: user.email,
    // ✅ Password excluded
  },
})
```

### ❌ Don't Use Weak JWT Secrets

**Bad**:
```typescript
JWT_SECRET=secret123 // ❌ Too weak!
```

**Good**:
```typescript
JWT_SECRET=Q8z7X2m9P4k3L6n1R5t8Y0w3E6r9T2u5I8o1P4a7S0d3F6g9H2j5K // ✅ Strong random secret
```

## OWASP Top 10 Compliance

| Vulnerability | Mitigation |
|---------------|-----------|
| **A01: Broken Access Control** | API key permissions, JWT sessions, middleware checks |
| **A02: Cryptographic Failures** | bcrypt for passwords, HTTPS enforcement, secure secrets |
| **A03: Injection** | Prisma/Kysely (parameterized queries), Valibot validation |
| **A04: Insecure Design** | Principle of least privilege, defense in depth |
| **A05: Security Misconfiguration** | Helmet headers, CORS, CSP |
| **A07: ID & Auth Failures** | Rate limiting, better-auth, strong secrets |
| **A08: Software/Data Integrity** | Package lock files, dependency scanning |

## Security Checklist

Before deployment, verify:

- [ ] All passwords hashed with bcrypt (via better-auth)
- [ ] JWT secret is 256+ bits random
- [ ] API keys rotated every 12 months
- [ ] Rate limiting on login and API endpoints
- [ ] Security headers configured (Helmet, CORS, CSP)
- [ ] HTTPS enforced in production
- [ ] Auth events logged for audit trail
- [ ] No secrets in code (all in environment variables)
- [ ] API key permissions follow least privilege
- [ ] Password requirements enforced (12+ chars, complexity)

## Related

- [docs/04-authentication-solutions.md](../../docs/04-authentication-solutions.md) - better-auth rationale
- [.claude/agents/auth-specialist.md](../.claude/agents/auth-specialist.md) - Auth agent
- [OWASP Top 10](https://owasp.org/Top10/)
