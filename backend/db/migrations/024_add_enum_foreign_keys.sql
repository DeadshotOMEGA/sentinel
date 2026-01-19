-- Migration: 024_add_enum_foreign_keys
-- Description: Add foreign key columns referencing enum tables for backward-compatible migration
-- Created: 2026-01-15
--
-- This migration implements a dual-column strategy:
-- - New UUID columns reference the enum lookup tables (created in migration 023)
-- - Old VARCHAR columns remain intact for backward compatibility
-- - Migration 025 (cleanup) will drop the old columns after application code is updated

-- ============================================================================
-- ADD NEW FOREIGN KEY COLUMNS (NULLABLE)
-- ============================================================================

-- visitors.visit_type_id -> visit_types.id
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS visit_type_id UUID;

-- members.member_status_id -> member_statuses.id
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_status_id UUID;

-- members.member_type_id -> member_types.id
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_type_id UUID;

-- badges.badge_status_id -> badge_statuses.id
ALTER TABLE badges ADD COLUMN IF NOT EXISTS badge_status_id UUID;

-- ============================================================================
-- POPULATE NEW COLUMNS FROM EXISTING VARCHAR VALUES
-- ============================================================================

-- Populate visitors.visit_type_id from visitors.visit_type
UPDATE visitors v
SET visit_type_id = vt.id
FROM visit_types vt
WHERE vt.code = v.visit_type
  AND v.visit_type_id IS NULL;

-- Populate members.member_status_id from members.status
UPDATE members m
SET member_status_id = ms.id
FROM member_statuses ms
WHERE ms.code = m.status
  AND m.member_status_id IS NULL;

-- Populate members.member_type_id from members.member_type
UPDATE members m
SET member_type_id = mt.id
FROM member_types mt
WHERE mt.code = m.member_type
  AND m.member_type_id IS NULL;

-- Populate badges.badge_status_id from badges.status
UPDATE badges b
SET badge_status_id = bs.id
FROM badge_statuses bs
WHERE bs.code = b.status
  AND b.badge_status_id IS NULL;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Foreign key: visitors.visit_type_id -> visit_types.id
ALTER TABLE visitors
ADD CONSTRAINT fk_visitors_visit_type_id
FOREIGN KEY (visit_type_id) REFERENCES visit_types(id) ON DELETE RESTRICT;

-- Foreign key: members.member_status_id -> member_statuses.id
ALTER TABLE members
ADD CONSTRAINT fk_members_member_status_id
FOREIGN KEY (member_status_id) REFERENCES member_statuses(id) ON DELETE RESTRICT;

-- Foreign key: members.member_type_id -> member_types.id
ALTER TABLE members
ADD CONSTRAINT fk_members_member_type_id
FOREIGN KEY (member_type_id) REFERENCES member_types(id) ON DELETE RESTRICT;

-- Foreign key: badges.badge_status_id -> badge_statuses.id
ALTER TABLE badges
ADD CONSTRAINT fk_badges_badge_status_id
FOREIGN KEY (badge_status_id) REFERENCES badge_statuses(id) ON DELETE RESTRICT;

-- ============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_visitors_visit_type_id ON visitors(visit_type_id);
CREATE INDEX IF NOT EXISTS idx_members_member_status_id ON members(member_status_id);
CREATE INDEX IF NOT EXISTS idx_members_member_type_id ON members(member_type_id);
CREATE INDEX IF NOT EXISTS idx_badges_badge_status_id ON badges(badge_status_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN visitors.visit_type_id IS 'Foreign key to visit_types enum table (dual-column migration - replaces visit_type VARCHAR)';
COMMENT ON COLUMN members.member_status_id IS 'Foreign key to member_statuses enum table (dual-column migration - replaces status VARCHAR)';
COMMENT ON COLUMN members.member_type_id IS 'Foreign key to member_types enum table (dual-column migration - replaces member_type VARCHAR)';
COMMENT ON COLUMN badges.badge_status_id IS 'Foreign key to badge_statuses enum table (dual-column migration - replaces status VARCHAR)';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration:
-- 1. Adds nullable UUID columns for enum foreign keys
-- 2. Populates them from existing VARCHAR values via JOIN on code
-- 3. Adds FOREIGN KEY constraints with ON DELETE RESTRICT
-- 4. Creates indexes for query performance
--
-- The old VARCHAR columns and their CHECK constraints remain intact.
-- Migration 025 will drop them after application code is updated.
-- ============================================================================
