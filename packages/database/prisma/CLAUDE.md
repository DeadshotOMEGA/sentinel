# Prisma Schema Documentation

Schema definition for Sentinel RFID Attendance System using **Prisma 7** with PostgreSQL.

## Location

`packages/database/prisma/schema.prisma`

## Schema Management Workflow

### Making Schema Changes

```bash
# 1. Edit schema.prisma
vim schema.prisma

# 2. Validate syntax
pnpm prisma validate

# 3. Format schema (auto-formats on save)
pnpm prisma format

# 4. Generate TypeScript client (REQUIRED after changes)
pnpm prisma generate

# 5. Apply to development database
pnpm prisma db push

# 6. Create migration for production
pnpm prisma migrate dev --name descriptive_name
```

### Critical After Schema Changes

**ALWAYS run `pnpm prisma generate` after modifying schema.prisma**

This regenerates the TypeScript types that repositories and tests depend on. Without regeneration:
- TypeScript errors about missing fields
- Tests fail with "Unknown argument" errors
- Runtime errors about undefined properties

## Schema Organization

The schema is organized into sections:

1. **Generator & Datasource** (lines 1-20)
2. **Core Models** (lines 21-285):
   - Member, Badge, Checkin
   - Division, Tag, Visitor
   - Event, EventAttendee, EventCheckin
   - AdminUser, AuditLog
3. **BMQ System** (lines 286-350)
4. **DDS System** (lines 351-400)
5. **Enum Tables** (lines 433-527):
   - MemberStatus, MemberType
   - VisitType, BadgeStatus
   - ListItem

## Naming Conventions

### Table Names (@@map)

Use **snake_case** for table names:
```prisma
model MemberStatus {
  // ...
  @@map("member_statuses")  // Table name in database
}
```

### Column Names (@map)

Use **snake_case** for column names:
```prisma
model Member {
  firstName    String  @map("first_name")  // Column name in database
  memberTypeId String? @map("member_type_id")
}
```

### Field Names (Prisma/TypeScript)

Use **camelCase** for Prisma field names:
```prisma
model Member {
  firstName    String   // camelCase in TypeScript
  memberTypeId String?  // camelCase in TypeScript
}
```

### Index Names (map: "...")

Follow pattern: `idx_{table}_{column}` or `idx_{table}_{columns}`
```prisma
@@index([code], map: "idx_member_statuses_code")
@@index([memberTypeId], map: "idx_members_member_type_id")
@@index([listType, displayOrder], map: "idx_list_items_list_type_display_order")
```

## UUID Primary Keys

All tables use PostgreSQL's `gen_random_uuid()` function:

```prisma
model MyModel {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
}
```

**Why dbgenerated?**
- Leverages native PostgreSQL UUID generation
- More efficient than application-generated UUIDs
- Works with `uuid-ossp` or `pgcrypto` extensions

## Timestamps

Standard timestamp pattern:

```prisma
model MyModel {
  createdAt DateTime? @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt DateTime? @default(now()) @map("updated_at") @db.Timestamp(6)
}
```

**Nullable timestamps** allow:
- Database-managed update times (triggers)
- Backward compatibility with existing data
- Flexibility in data migrations

## Relations

### One-to-Many Pattern

```prisma
model Division {
  id      String   @id @default(dbgenerated("gen_random_uuid()"))
  members Member[] // Array indicates "one-to-many"
}

model Member {
  divisionId String?   @map("division_id") @db.Uuid
  division   Division? @relation(fields: [divisionId], references: [id])
}
```

**Key points**:
- Parent has array field (`Member[]`)
- Child has FK field + relation field
- Both sides must be defined (bidirectional)

### Enum Table Relations

Enum tables use the same one-to-many pattern:

```prisma
model MemberStatus {
  id      String   @id @default(dbgenerated("gen_random_uuid()"))
  code    String   @unique
  name    String
  members Member[] // ⚠️ Reverse relation REQUIRED
  @@map("member_statuses")
}

model Member {
  memberStatusId  String?       @map("member_status_id") @db.Uuid
  memberStatusRef MemberStatus? @relation(fields: [memberStatusId], references: [id])
}
```

**Critical Requirements**:
1. Child table: FK column (`memberStatusId`)
2. Child table: Relation field (`memberStatusRef`)
3. Parent table: Reverse relation array (`members Member[]`)
4. Both tables: Index on FK column

**Common Error**: Missing reverse relation causes Prisma validation error:
```
Error validating: The relation field `memberStatusRef` on Model `Member`
must specify the `references` argument
```

**Fix**: Add array field to parent table.

### Self-Referencing Relations

Some models reference themselves:

```prisma
model DdsAssignment {
  transferredToMemberId String?       @map("transferred_to_member_id") @db.Uuid
  transferredToMember   Member?       @relation("DdsTransferredTo", fields: [transferredToMemberId], references: [id])
}

model Member {
  ddsAssignments DdsAssignment[] @relation("DdsMember")
  ddsTransfers   DdsAssignment[] @relation("DdsTransferredTo")
}
```

**Named relations** (@relation("Name")) disambiguate multiple relations between same tables.

## Indexes

### Single Column Indexes

```prisma
@@index([email], map: "idx_members_email")
@@index([status], map: "idx_members_status")
```

Add indexes for:
- Foreign keys (Prisma doesn't auto-index FKs)
- Frequently queried columns
- Filter conditions in WHERE clauses
- JOIN conditions

### Composite Indexes

```prisma
@@index([listType, displayOrder], map: "idx_list_items_list_type_display_order")
@@index([kioskId, timestamp(sort: Desc)], map: "idx_checkins_kiosk")
```

Order matters:
- First column most selective
- Supports queries on prefix (first N columns)
- `(listType, displayOrder)` supports queries on `listType` alone
- But not queries on `displayOrder` alone

### Sort Order in Indexes

```prisma
@@index([timestamp(sort: Desc)], map: "idx_checkins_timestamp")
@@index([memberId, timestamp(sort: Desc)], map: "idx_checkins_member_timestamp")
```

Specify sort order for descending queries (recent-first).

### Unique Constraints

```prisma
model MemberStatus {
  code String @unique @db.VarChar(50)
}

model ListItem {
  @@unique([listType, code], map: "list_items_list_type_code_unique")
}
```

Single-column unique: `@unique` attribute
Multi-column unique: `@@unique([col1, col2])` block attribute

## Enum Tables

### Standard Enum Table Template

```prisma
model MyEnumTable {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code        String    @unique @db.VarChar(50)
  name        String    @db.VarChar(100)
  description String?
  color       String?   @db.VarChar(50)
  createdAt   DateTime? @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt   DateTime? @default(now()) @map("updated_at") @db.Timestamp(6)

  // Reverse relation to parent table
  parents ParentModel[]

  @@index([code], map: "idx_my_enum_table_code")
  @@index([name], map: "idx_my_enum_table_name")
  @@map("my_enum_table")
}
```

### ListItem (Generic Enum)

Special enum table supporting multiple list types:

```prisma
model ListItem {
  listType     String    @map("list_type") @db.VarChar(50)  // 'rank', 'role', 'mess', 'moc'
  code         String    @db.VarChar(50)
  displayOrder Int       @default(0) @map("display_order")
  isSystem     Boolean   @default(false) @map("is_system")

  @@unique([listType, code], map: "list_items_list_type_code_unique")
  @@index([listType], map: "idx_list_items_list_type")
  @@index([listType, displayOrder], map: "idx_list_items_list_type_display_order")
}
```

**Key features**:
- `listType` discriminator for different lists
- Unique on `[listType, code]` (same code across types OK)
- `displayOrder` for UI sorting (drag-and-drop)
- `isSystem` flag to protect built-in values from deletion

## Adding Foreign Keys

### Step-by-Step Process

When adding FK relationship between existing tables:

#### 1. Add FK Column to Child Table

```prisma
model Member {
  // Existing columns...
  memberStatusId String? @map("member_status_id") @db.Uuid  // ← Add this
}
```

Make it nullable (`?`) during transition period.

#### 2. Add Relation Field to Child Table

```prisma
model Member {
  memberStatusId  String?       @map("member_status_id") @db.Uuid
  memberStatusRef MemberStatus? @relation(fields: [memberStatusId], references: [id], onDelete: Restrict, onUpdate: NoAction)
  // ← Add this
}
```

**onDelete options**:
- `Restrict`: Prevent deletion of parent if children exist (recommended for enums)
- `SetNull`: Set child FK to NULL when parent deleted
- `Cascade`: Delete children when parent deleted
- `NoAction`: Database handles it (check DB constraints)

#### 3. Add Reverse Relation to Parent Table

```prisma
model MemberStatus {
  // Existing columns...
  members Member[]  // ← Add this (REQUIRED!)
}
```

#### 4. Add Index for FK Column

```prisma
model Member {
  // ...
  @@index([memberStatusId], map: "idx_members_member_status_id")  // ← Add this
}
```

#### 5. Regenerate and Apply

```bash
pnpm prisma generate  # Regenerate TypeScript client
pnpm prisma db push   # Apply to dev database
# OR
pnpm prisma migrate dev --name add_member_status_fk  # Create migration
```

### Maintaining Backward Compatibility

During migration, keep both string and FK columns:

```prisma
model Member {
  // Legacy column (keep during transition)
  status         String   @default("active") @db.VarChar(20)

  // New FK column (nullable during transition)
  memberStatusId String?  @map("member_status_id") @db.Uuid

  // Relation (nullable)
  memberStatusRef MemberStatus? @relation(fields: [memberStatusId], references: [id])
}
```

**Migration path**:
1. Add nullable FK column + relation
2. Populate enum table with existing values
3. Migrate data: Update FK to reference enum records
4. Application updates: Use FK instead of string
5. Eventually: Make FK required, remove string column

## Common Issues and Solutions

### Issue: "relation field must specify references"

**Error**:
```
Error validating: The relation field `memberStatusRef` on Model `Member`
must specify the `references` argument
```

**Cause**: Missing reverse relation on parent table.

**Fix**: Add array field to parent:
```prisma
model MemberStatus {
  members Member[]  // Add this!
}
```

### Issue: Schema validates but tests fail

**Error**: Tests fail with "Unknown argument memberStatusId"

**Cause**: Forgot to regenerate Prisma client after schema changes.

**Fix**:
```bash
pnpm prisma generate  # REQUIRED after any schema change
```

### Issue: Migration creates FK but Prisma doesn't see it

**Cause**: Prisma client not regenerated or using old client.

**Fix**:
1. Delete `node_modules/.prisma` directory
2. Run `pnpm prisma generate`
3. Restart dev server / re-run tests

### Issue: "column does not exist" in repository queries

**Error**: `column "member_status_id" does not exist`

**Cause**: FK column added to schema but not applied to database.

**Fix**:
```bash
pnpm prisma db push      # Development
# OR
pnpm prisma migrate deploy  # Production
```

### Issue: Unique constraint violation

**Error**: `duplicate key value violates unique constraint "member_statuses_code_key"`

**Cause**: Trying to create enum value with code that already exists.

**Fix**: Use different code or query existing before creating:
```typescript
const existing = await repo.findByCode(code)
if (existing) return existing
return await repo.create({ code, name, ... })
```

## Data Types

### Common PostgreSQL Types

```prisma
// Text
@db.VarChar(50)     // Variable length, up to 50 chars
@db.VarChar(100)
@db.Text            // Unlimited length

// Numbers
@db.Integer         // 4-byte integer
@db.BigInt          // 8-byte integer
@db.Decimal(10, 2)  // Decimal with precision

// Dates/Times
@db.Timestamp(6)    // Timestamp with microseconds
@db.Timestamptz(6)  // Timestamp with timezone
@db.Date            // Date only (no time)

// UUID
@db.Uuid            // PostgreSQL UUID type

// Boolean
(no annotation needed - Boolean maps to boolean)
```

### Choosing String Length

Guidelines:
- **VarChar(20)**: Short codes (status, member type)
- **VarChar(50)**: Codes, short names, colors
- **VarChar(100)**: Names, titles
- **VarChar(200)**: Longer names (visitor names, organizations)
- **VarChar(255)**: Emails, URLs
- **Text**: Unlimited (notes, descriptions, JSON)

## Performance Considerations

### Use Appropriate Field Types

```prisma
// ❌ Inefficient
status String @db.Text  // Text for 10-char status

// ✅ Efficient
status String @db.VarChar(20)
```

Shorter types → faster indexing and queries.

### Index Frequently Queried Columns

```prisma
// Without index: Full table scan
SELECT * FROM members WHERE email = 'user@example.com'

// With index: Fast lookup
@@index([email], map: "idx_members_email")
```

Add indexes for:
- Unique lookups (email, service number)
- Foreign keys (ALWAYS)
- Filter conditions (status, division)
- Sort orders (timestamp DESC)

### Avoid Over-Indexing

Each index:
- Slows down writes (INSERT, UPDATE, DELETE)
- Consumes disk space
- Adds maintenance overhead

**Rule of thumb**: Index columns used in WHERE, JOIN, ORDER BY frequently. Don't index columns rarely queried.

## Schema Validation

### Run Validation

```bash
pnpm prisma validate
```

Checks:
- Syntax errors
- Invalid field types
- Missing relation fields
- Circular dependencies
- Invalid constraints

### Format Schema

```bash
pnpm prisma format
```

Auto-formats:
- Consistent spacing
- Alphabetical model order
- Aligned attribute blocks

Most editors auto-format on save.

## Migration Best Practices

### Development

Use `db push` for rapid iteration:
```bash
pnpm prisma db push
```

**No migration files created** - applies schema directly.

### Production

Use migrations for version control:
```bash
# Create migration
pnpm prisma migrate dev --name descriptive_name

# Apply to production
pnpm prisma migrate deploy
```

**Migration files tracked in git** - ensures consistent schema across environments.

### Destructive Changes

Some changes lose data:
- Dropping columns
- Changing types
- Adding NOT NULL to existing nullable column

**Solution**: Multi-step migration
1. Add new column (nullable)
2. Migrate data
3. Make required / drop old column

## References

- [Prisma Schema Reference](https://www.prisma.io/docs/orm/prisma-schema)
- [Prisma Relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [Database Package Documentation](../CLAUDE.md)
