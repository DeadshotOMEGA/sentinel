# CLAUDE Rules: Prisma Schema

Schema definition for Sentinel RFID Attendance System using Prisma 7 with PostgreSQL.

---

## Scope
Applies when modifying: `packages/database/prisma/schema.prisma`, `packages/database/prisma/prisma.config.ts`

## Non-Negotiables (MUST / MUST NOT)

**Schema Changes**:
- MUST run `pnpm prisma generate` after ANY schema.prisma modification
- MUST run `pnpm prisma validate` before committing changes
- MUST use `pnpm prisma format` to auto-format schema

**Naming Conventions**:
- MUST use snake_case for table names via `@@map("table_name")`
- MUST use snake_case for column names via `@map("column_name")`
- MUST use camelCase for Prisma/TypeScript field names
- MUST follow index naming: `idx_{table}_{column}` or `idx_{table}_{columns}`

**Primary Keys**:
- MUST use UUID via `@id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- MUST NOT use auto-increment integers

**Timestamps**:
- MUST use nullable DateTime with `@default(now())` and `@map("created_at") @db.Timestamp(6)`
- MUST use pattern: `createdAt DateTime? @default(now()) @map("created_at") @db.Timestamp(6)`

**Relations**:
- MUST define bidirectional relations (parent has array field, child has FK + relation field)
- MUST add reverse relation array to parent table (e.g., `members Member[]`)
- MUST add index for all FK columns
- MUST use `onDelete: Restrict` for enum table relations

**Data Types**:
- MUST use appropriate VarChar lengths: 20 (codes), 50 (short names), 100 (names), 200 (long names), 255 (emails/URLs)
- MUST use `@db.Uuid` for UUID columns
- MUST use `@db.Timestamp(6)` for timestamps

## Defaults (SHOULD)

**Indexing**:
- SHOULD index foreign keys (not auto-indexed by Prisma)
- SHOULD index frequently queried columns (WHERE, JOIN, ORDER BY)
- SHOULD use composite indexes for multi-column queries

**Migrations**:
- SHOULD use `db push` for development (fast iteration)
- SHOULD use `migrate dev` for production (version control)
- SHOULD test destructive changes with multi-step migrations

**Enum Tables**:
- SHOULD use standard enum table template (id, code, name, description, color, timestamps)
- SHOULD add `@@index([code])` and `@@index([name])` to enum tables

## Workflow

**When modifying schema**:
1. Edit schema.prisma
2. Run `pnpm prisma validate` to check syntax
3. Run `pnpm prisma format` to auto-format
4. Run `pnpm prisma generate` to regenerate TypeScript types
5. Apply: `pnpm prisma db push` (dev) or `pnpm prisma migrate dev --name description` (prod)

**When adding FK relationship**:
1. Add nullable FK column to child table: `myEnumId String? @map("my_enum_id") @db.Uuid`
2. Add relation field to child: `myEnumRef MyEnum? @relation(fields: [myEnumId], references: [id], onDelete: Restrict)`
3. Add reverse relation to parent: `children ChildModel[]`
4. Add index to child: `@@index([myEnumId], map: "idx_children_my_enum_id")`
5. Regenerate: `pnpm prisma generate`
6. Apply: `pnpm prisma db push`

**When adding enum table**:
1. Use standard template (see Quick Reference below)
2. Add reverse relation to parent tables
3. Create indexes for code and name
4. Regenerate and apply

## Quick Reference

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

### Relation Pattern

```prisma
// Parent (enum table)
model Division {
  id      String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  members Member[] // Array indicates "one-to-many"
  @@map("divisions")
}

// Child
model Member {
  divisionId String?   @map("division_id") @db.Uuid
  division   Division? @relation(fields: [divisionId], references: [id], onDelete: Restrict)

  @@index([divisionId], map: "idx_members_division_id")
  @@map("members")
}
```

### ListItem (Generic Enum)

```prisma
model ListItem {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  listType     String    @map("list_type") @db.VarChar(50)  // 'rank', 'role', 'mess', 'moc'
  code         String    @db.VarChar(50)
  name         String    @db.VarChar(100)
  description  String?
  color        String?   @db.VarChar(50)
  displayOrder Int       @default(0) @map("display_order")
  isSystem     Boolean   @default(false) @map("is_system")

  @@unique([listType, code], map: "list_items_list_type_code_unique")
  @@index([listType], map: "idx_list_items_list_type")
  @@index([listType, displayOrder], map: "idx_list_items_list_type_display_order")
  @@map("list_items")
}
```

### Common Data Types

```prisma
// Text
@db.VarChar(50)     // Variable length, up to 50 chars
@db.Text            // Unlimited length

// Numbers
@db.Integer         // 4-byte integer
@db.BigInt          // 8-byte integer

// Dates/Times
@db.Timestamp(6)    // Timestamp with microseconds
@db.Date            // Date only (no time)

// UUID
@db.Uuid            // PostgreSQL UUID type
```

### Schema Commands

```bash
pnpm prisma validate        # Check syntax
pnpm prisma format          # Auto-format
pnpm prisma generate        # Regenerate TypeScript types
pnpm prisma db push         # Apply to dev database
pnpm prisma migrate dev     # Create migration
pnpm prisma migrate deploy  # Apply migrations (production)
pnpm prisma studio          # GUI database browser
```

---

**Common Error**: "relation field must specify references" → Missing reverse relation array on parent table.

**Common Error**: "Unknown argument" in tests → Forgot to run `pnpm prisma generate` after schema changes.

**Related**: @packages/database/CLAUDE.md (database package overview), @packages/database/src/CLAUDE.md (query patterns)
