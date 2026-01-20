# Reference Documentation (AI-First Guide)

**Purpose:** Information-oriented specifications and lookups

**AI Context Priority:** medium

**When to Load:** User needs to look up specs, parameters, configurations

**Triggers:** reference, api, specification, spec, config, parameters

---

## Quick Reference

### What Goes Here

Complete, precise specifications:
- API endpoints
- Configuration options
- Database schemas
- Environment variables
- Command-line interfaces
- Type definitions

### Characteristics

- **Information-oriented** - Facts and specs
- **Complete** - Every option documented
- **Organized by structure** - Logical grouping
- **Precise** - Exact parameters, types
- **No narrative** - Tables, lists, specs only

---

## When to Create Reference Docs

**Create reference when:**
- API exists without formal spec
- Configuration needs documentation
- Multiple options/parameters exist
- Users need to look up details
- Specification is stable

**Don't create reference for:**
- Teaching how to use (use tutorial)
- Solving specific tasks (use how-to)
- Explaining concepts (use explanation)

---

## Reference Structure

### For APIs

**Required sections:**
1. Overview (brief)
2. Authentication (if needed)
3. Endpoints (grouped logically)
4. Error codes
5. Examples

**Per endpoint:**
- HTTP method and path
- Description (one sentence)
- Request format
- Response format
- Status codes
- Errors
- Example curl command

### For Configurations

**Required sections:**
1. Overview
2. Configuration options (table)
3. Default values
4. Valid values/types
5. Examples

---

## Writing Good Reference Docs

### Do

✅ **Be complete and precise**
```markdown
### POST /api/members

**Description:** Create new member

**Request:**
```typescript
{
  serviceNumber: string      // 6+ chars, unique
  rank: Rank                 // See Rank enum
  firstName: string          // 1-50 chars
  lastName: string           // 1-50 chars
  divisionId: string         // UUID, must exist
}
```

**Response (201):**
```typescript
{
  id: string                 // UUID
  serviceNumber: string
  rank: Rank
  firstName: string
  lastName: string
  divisionId: string
  createdAt: string          // ISO 8601
  updatedAt: string          // ISO 8601
}
```

**Errors:**
- `400` - Invalid request body
- `409` - Duplicate service number
- `401` - Unauthorized

**Example:**
```bash
curl -X POST http://localhost:3000/api/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"serviceNumber":"123456","rank":"AB",...}'
```
```

✅ **Use tables for options**
```markdown
## Environment Variables

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | string | Yes | - | PostgreSQL connection string |
| `PORT` | number | No | 3000 | Server port |
| `LOG_LEVEL` | string | No | info | winston log level |
```

✅ **Group logically**
```markdown
## Member Endpoints

### Create Member
[Spec]

### Get Member
[Spec]

### Update Member
[Spec]

## Division Endpoints

### List Divisions
[Spec]
```

### Don't

❌ **Include narrative explanation**
```markdown
### POST /api/members

This endpoint is really useful when you want to create members.
First, you need to understand how members work in the system...
[Long explanation instead of specs]
```

❌ **Be incomplete**
```markdown
### POST /api/members

Creates a member.

[No request format, no response format, no error codes]
```

❌ **Mix with how-to**
```markdown
## API Reference

To use the API, first authenticate by...
[Tutorial/how-to mixed with reference]
```

---

## File Naming

**Pattern:** `[subject]-reference.md` or `[subject]-api.md`

**Examples:**
- `api-endpoints.md` - Complete API reference
- `member-api.md` - Member-specific endpoints
- `environment-variables.md` - Env var reference
- `database-schema.md` - Schema specification
- `configuration-options.md` - Config reference

**Type prefix optional** - directory indicates reference

---

## Auto-Generation

**Prefer auto-generated reference when possible:**

**OpenAPI/Swagger:**
- Generate from ts-rest contracts
- Keep in sync with code
- Less maintenance

**Type documentation:**
- Generate from TypeScript types
- Use TSDoc comments
- Export to markdown

**Database schema:**
- Generate from Prisma schema
- Include relations and constraints

---

## Related Documentation

**How-to guides:**
- [How-to CLAUDE.md](../howto/CLAUDE.md) - Using the APIs

**Explanation:**
- [Explanation CLAUDE.md](../explanation/CLAUDE.md) - Why APIs designed this way

**Templates:**
- [Reference Template](../../templates/reference.md)

---

**Last Updated:** 2026-01-19
