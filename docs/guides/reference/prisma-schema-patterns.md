---
type: reference
title: Prisma Schema Patterns
status: current
created: 2026-01-23
last_updated: 2026-01-23
---

# Prisma Schema Patterns

Reference guide for common Prisma schema patterns used in the Sentinel database.

## Standard Enum Table Template

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

## Relation Pattern

One-to-many relationship with bidirectional fields:

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

## ListItem (Generic Enum)

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

## Common Data Types

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

## Schema Commands

```bash
pnpm prisma validate        # Check syntax
pnpm prisma format          # Auto-format
pnpm prisma generate        # Regenerate TypeScript types
pnpm prisma db push         # Apply to dev database
pnpm prisma migrate dev     # Create migration
pnpm prisma migrate deploy  # Apply migrations (production)
pnpm prisma studio          # GUI database browser
```

## VarChar Length Guidelines

Use these standard lengths for string columns:

- `VarChar(20)` - Short codes (RFID tags, status codes)
- `VarChar(50)` - Names, enum codes
- `VarChar(100)` - Full names, descriptions
- `VarChar(200)` - Long names, addresses
- `VarChar(255)` - Email addresses, URLs
