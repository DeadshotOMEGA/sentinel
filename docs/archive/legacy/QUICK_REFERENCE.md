# Quick Reference: Sentinel Architecture

## File Locations - Quick Lookup

### Backend Routing
- **Main routes mount:** `/backend/src/routes/index.ts`
- **Member CRUD:** `/backend/src/routes/members.ts` (37-205)
- **Division CRUD:** `/backend/src/routes/divisions.ts` (22-108)
- **Route pattern:** All use Zod validation + custom errors + auth middleware

### Database
- **Connection:** `/backend/src/db/connection.ts` (pg Pool)
- **Base patterns:** `/backend/src/db/repositories/base-repository.ts`
- **Member repo:** `/backend/src/db/repositories/member-repository.ts`
- **Division repo:** `/backend/src/db/repositories/division-repository.ts`
- **Schema:** `/backend/db/schema.sql`
- **Test data:** `/backend/db/seed/dev-data.sql`

### Frontend Pages & Components
- **Member page:** `/frontend/src/pages/Members.tsx`
- **Member modal:** `/frontend/src/components/MemberModal.tsx`
- **API client:** `/frontend/src/lib/api.ts`
- **Routes:** `/frontend/src/App.tsx:39-46`

### Shared Types
- **All types:** `/shared/types/index.ts`
- **Member type:** `/shared/types/member.ts`
- **Division type:** `/shared/types/division.ts`

### Error Handling
- **Custom errors:** `/backend/src/utils/errors.ts`
- **Error classes:** NotFoundError, ValidationError, ConflictError, etc.
- **Middleware:** `/backend/src/middleware/error-handler.ts`

---

## API Endpoint Quick Reference

### Members
```
GET    /api/members                 - List (with search, status filter)
GET    /api/members/:id             - Get one
POST   /api/members                 - Create (admin only)
PUT    /api/members/:id             - Update (admin only)
DELETE /api/members/:id             - Soft delete (admin only)
GET    /api/members/:id/history     - Checkin history
```

### Divisions
```
GET    /api/divisions               - List all
POST   /api/divisions               - Create (admin only)
PUT    /api/divisions/:id           - Update (admin only)
DELETE /api/divisions/:id           - Delete if no members (admin only)
```

---

## Database Schema - Key Tables

### members table
```sql
id UUID PRIMARY KEY
service_number VARCHAR(20) UNIQUE      ← Must check before insert
rank VARCHAR(50) NOT NULL
first_name VARCHAR(100) NOT NULL
last_name VARCHAR(100) NOT NULL
division_id UUID REFERENCES divisions(id)  ← Foreign key validation needed
member_type VARCHAR(20) -- 'full_time' or 'reserve'
status VARCHAR(20) DEFAULT 'active'     ← 'active' or 'inactive'
email, phone, badge_id (optional)
created_at, updated_at TIMESTAMP
```

### divisions table
```sql
id UUID PRIMARY KEY
name VARCHAR(100) NOT NULL
code VARCHAR(20) UNIQUE NOT NULL        ← Check before update
created_at TIMESTAMP
```

### Current Divisions (test data)
| Code | Name | ID (test) |
|------|------|-----------|
| OPS | Operations | 11111111-1111-1111-1111-111111111111 |
| ADMIN | Administration | 22222222-2222-2222-2222-222222222222 |
| TRAIN | Training | 33333333-3333-3333-3333-333333333333 |
| CMD | Command | 44444444-4444-4444-4444-444444444444 |

---

## Code Patterns - Copy/Paste Ready

### 1. Add New Route (example: POST /api/members/import)

**File: `/backend/src/routes/members.ts`**

```typescript
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { memberRepository } from '../db/repositories/member-repository';
import { requireAuth, requireRole } from '../auth';
import { ValidationError } from '../utils/errors';

const router = Router();

// Validation schema
const importMembersSchema = z.object({
  members: z.array(z.object({
    serviceNumber: z.string().min(1).max(20),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    rank: z.string().min(1).max(50),
    divisionId: z.string().uuid(),
    memberType: z.enum(['full-time', 'reserve']),
  }))
});

// POST /api/members/import
router.post('/import', requireAuth, requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = importMembersSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid import data',
          validationResult.error.message,
          'Check CSV format and try again.'
        );
      }

      // Process import...
      const data = validationResult.data;

      res.json({ imported: 0, skipped: 0, errors: [] });
    } catch (err) {
      next(err);
    }
  }
);
```

### 2. Query Pattern with Repository

**File: `/backend/src/db/repositories/member-repository.ts`**

```typescript
// Find with filters
async findAll(filters?: MemberFilters): Promise<MemberWithDivision[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.divisionId) {
    conditions.push(`m.division_id = $${paramIndex++}`);
    params.push(filters.divisionId);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const query = `
    SELECT m.*, d.*
    FROM members m
    INNER JOIN divisions d ON m.division_id = d.id
    ${whereClause}
    ORDER BY m.last_name, m.first_name
  `;

  const rows = await this.queryAll<Record<string, unknown>>(query, params);

  return rows.map(row => ({
    ...toCamelCase<Member>({...}),
    division: toCamelCase<Division>({...})
  }));
}
```

### 3. Transaction Pattern (for bulk inserts)

```typescript
async bulkImport(members: CreateMemberInput[]): Promise<void> {
  const client = await this.beginTransaction();

  try {
    for (const member of members) {
      // Insert each member
      await client.query(
        'INSERT INTO members (...) VALUES (...)',
        [member.serviceNumber, ...]
      );
    }
    await this.commitTransaction(client);
  } catch (error) {
    await this.rollbackTransaction(client);
    throw error;
  }
}
```

### 4. Frontend API Call Pattern

**File: `/frontend/src/pages/Members.tsx`**

```typescript
const { data: membersData, isLoading, refetch } = useQuery({
  queryKey: ['members', { search, status: statusFilter }],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const response = await api.get<{ members: MemberWithDivision[] }>(
      `/members?${params}`
    );
    return response.data;
  },
});

// Manual refetch after operation
const handleSave = () => {
  refetch();
};
```

### 5. Frontend Form Handling

**File: `/frontend/src/components/MemberModal.tsx`**

```typescript
const [formData, setFormData] = useState<Partial<CreateMemberInput>>({});
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async () => {
  setIsLoading(true);
  setError('');
  try {
    if (isEdit) {
      await api.put(`/members/${member.id}`, formData);
    } else {
      await api.post('/members', formData);
    }
    onSave();  // Trigger parent refetch
  } catch (err: unknown) {
    const error = err as { response?: { data?: { error?: { message?: string } } } };
    const errorMessage = error.response?.data?.error?.message;
    setError(errorMessage || 'Failed to save member');
  } finally {
    setIsLoading(false);
  }
};
```

---

## Authentication Pattern

### Add Auth to a Route

```typescript
// Require authentication
router.get('/members', requireAuth, async (req, res, next) => {
  // Any authenticated user can access
});

// Require admin role
router.post('/members', requireAuth, requireRole('admin'), async (req, res, next) => {
  // Only admins can access
});
```

### Test Credentials (development only)
- Username: `admin`
- Password: `admin123`
- Role: `admin` (full access)

---

## Error Response Format

All errors follow this pattern:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid member data",
    "details": "Field 'serviceNumber' is required",
    "howToFix": "Please check all required fields and try again."
  }
}
```

**Error codes used:**
- `VALIDATION_ERROR` (400) - Input validation failed
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Duplicate service number, etc.
- `UNAUTHORIZED` (401) - No auth token
- `FORBIDDEN` (403) - Auth token valid but insufficient permissions

---

## Type System Quick Reference

### Member Type (from `/shared/types/index.ts:1-49`)

```typescript
interface Member {
  id: string;
  serviceNumber: string;
  firstName: string;
  lastName: string;
  rank: string;
  divisionId: string;
  memberType: 'full-time' | 'reserve';      // Note: hyphen!
  status: 'active' | 'inactive' | 'leave';
  email?: string;
  phone?: string;
  badgeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemberWithDivision extends Member {
  division: Division;
}
```

### Division Type

```typescript
interface Division {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
}
```

### Create Input Types

```typescript
interface CreateMemberInput {
  serviceNumber: string;
  firstName: string;
  lastName: string;
  rank: string;
  divisionId: string;
  memberType: 'full-time' | 'reserve';
  status?: 'active' | 'inactive';
  email?: string;
  phone?: string;
  badgeId?: string;
}

interface UpdateMemberInput {
  // All fields optional for PATCH update
  serviceNumber?: string;
  firstName?: string;
  // ...
}
```

---

## Dependencies Available

### Backend (from `/backend/package.json`)
- **express** 4.18 - Web framework
- **pg** 8.11 - PostgreSQL client (raw SQL)
- **zod** 3.22 - Schema validation
- **bcrypt** 5.1 - Password hashing
- **jsonwebtoken** 9.0 - JWT tokens
- **helmet** 7.1 - Security headers
- **winston** 3.11 - Logging
- **socket.io** 4.7 - WebSockets
- **ioredis** 5.3 - Redis client

### Frontend (inferred from usage)
- **react** - UI framework
- **react-router-dom** - Routing
- **@tanstack/react-query** - Server state
- **axios** - HTTP client
- **@heroui/react** - UI components
- **tailwindcss** - Styling

---

## Common SQL Snippets

### Check if service number exists
```sql
SELECT * FROM members WHERE service_number = $1;
```

### Get member with division
```sql
SELECT m.*, d.* FROM members m
INNER JOIN divisions d ON m.division_id = d.id
WHERE m.id = $1;
```

### Soft delete member
```sql
UPDATE members SET status = 'inactive', updated_at = NOW()
WHERE id = $1;
```

### List members by division
```sql
SELECT * FROM members
WHERE division_id = $1 AND status = 'active'
ORDER BY last_name, first_name;
```

### Check if division has members
```sql
SELECT COUNT(*) as count FROM members
WHERE division_id = $1;
```

---

## Environment Variables Needed

```bash
# Backend
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=sentinel
DB_USER=sentinel
DB_PASSWORD=sentinel

REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

---

## Development Commands

```bash
# Backend
cd backend
bun install
bun run migrate    # Run migrations
bun run seed       # Seed test data
bun run dev        # Start dev server
bun run typecheck  # Type check

# Frontend
cd frontend
bun install
bun run dev        # Start dev server
bun run build      # Production build

# Docker
docker-compose up  # Start PostgreSQL + Redis
```

