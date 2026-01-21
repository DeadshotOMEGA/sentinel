---
type: reference
title: "Sentinel Environment Variables Reference"
status: published
created: 2026-01-20
last_updated: 2026-01-20
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - environment
    - env
    - configuration
    - secrets
    - .env
  token_budget: 300
---

# Sentinel Environment Variables Reference

Complete reference for environment variables used in Sentinel.

## Environment File Location

**File**: `.env.local` (gitignored)

**Template**: `.env.example` (committed to repo)

```bash
# Copy template to create local config
cp .env.example .env.local
```

## Required Variables

### Database

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://sentinel:password@localhost:5432/sentinel?schema=public"
```

**Format**: `postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]`

**Development**: Uses Docker container (see docker-compose.yml)
**Production**: Replace with production database URL

### Authentication

```bash
# JWT signing secret (generate random string)
JWT_SECRET="your-secure-random-string-here"

# API key encryption secret
API_KEY_SECRET="another-secure-random-string"

# Session secret for better-auth
SESSION_SECRET="session-secret-random-string"
```

**Security Notes**:
- Use strong random strings (min 32 characters)
- Never commit secrets to git
- Rotate secrets periodically in production

**Generate secrets**:
```bash
# Using openssl
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Socket.IO

```bash
# Socket.IO session secret
SOCKET_IO_SECRET="socketio-secret-random-string"
```

Used for Socket.IO authentication and session management.

## Optional Variables

### Server Configuration

```bash
# Server port (default: 3000)
PORT=3000

# Node environment
NODE_ENV=development  # development | production | test

# API base path
API_BASE_PATH=/api/v1
```

### Logging

```bash
# Log level
LOG_LEVEL=debug  # error | warn | info | debug | trace

# Log format
LOG_FORMAT=pretty  # pretty | json
```

### CORS

```bash
# Allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Allow credentials
CORS_CREDENTIALS=true
```

### Rate Limiting

```bash
# Enable rate limiting
RATE_LIMIT_ENABLED=true

# Requests per window
RATE_LIMIT_MAX=100

# Window duration (minutes)
RATE_LIMIT_WINDOW=15
```

### Testing

```bash
# Test database URL (uses Testcontainers by default)
TEST_DATABASE_URL="postgresql://test:test@localhost:5433/sentinel_test?schema=public"

# Disable Testcontainers (use manual database)
USE_TESTCONTAINERS=false
```

## Environment-Specific Configs

### Development (.env.local)

```bash
NODE_ENV=development
DATABASE_URL="postgresql://sentinel:sentinel@localhost:5432/sentinel?schema=public"
JWT_SECRET="dev-jwt-secret-not-for-production"
API_KEY_SECRET="dev-api-key-secret"
SESSION_SECRET="dev-session-secret"
SOCKET_IO_SECRET="dev-socketio-secret"
LOG_LEVEL=debug
LOG_FORMAT=pretty
CORS_ORIGINS=http://localhost:5173
```

### Production (.env.production)

```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:password@production-host:5432/sentinel?schema=public&sslmode=require"
JWT_SECRET="<generated-production-secret>"
API_KEY_SECRET="<generated-production-secret>"
SESSION_SECRET="<generated-production-secret>"
SOCKET_IO_SECRET="<generated-production-secret>"
LOG_LEVEL=info
LOG_FORMAT=json
CORS_ORIGINS=https://sentinel.example.com
RATE_LIMIT_ENABLED=true
```

### Test (.env.test)

```bash
NODE_ENV=test
# Testcontainers manages DATABASE_URL automatically
LOG_LEVEL=error
LOG_FORMAT=json
USE_TESTCONTAINERS=true
```

## Validation

Environment variables are validated at startup using Valibot schemas.

**Location**: `apps/backend/src/lib/env.ts`

**Validation includes**:
- Required vs optional variables
- Type checking (string, number, boolean)
- Format validation (URLs, ports)
- Enum validation (log levels, environments)

## Security Best Practices

1. **Never commit secrets**
   - `.env.local` is gitignored
   - Use `.env.example` for templates only

2. **Use strong secrets**
   - Minimum 32 characters
   - Cryptographically random
   - Different for each environment

3. **Rotate secrets**
   - Production secrets rotated quarterly
   - Immediate rotation if compromised

4. **Limit access**
   - Secrets stored in secure vault (production)
   - Only authorized personnel have access

5. **Separate environments**
   - Different secrets for dev/staging/production
   - Never use development secrets in production

## Troubleshooting

### "Environment variable not found"

```bash
# Check .env.local exists
ls -la .env.local

# Verify variable name matches reference
cat .env.local | grep VARIABLE_NAME
```

### "Invalid DATABASE_URL format"

Ensure format matches:
```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]
```

Common issues:
- Missing `schema=public` query parameter
- Special characters in password not URL-encoded
- Incorrect port number

### "JWT verification failed"

- Ensure `JWT_SECRET` matches between startup sessions
- Don't change secret while tokens are in use
- Clear tokens/sessions after secret rotation

## Related Documentation

- [Architecture Reference](architecture.md)
- [Quick Commands Reference](commands.md)
- [How to Setup Environment](../../guides/howto/setup-environment.md) (when created)
- [Security Best Practices](../../cross-cutting/security/CLAUDE.md) (when created)
