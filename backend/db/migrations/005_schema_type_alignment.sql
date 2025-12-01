-- Migration: 005_schema_type_alignment
-- Description: Align remaining database schema with TypeScript types (CRITICAL-4)
-- Purpose: Fix type/schema mismatches for members.email, divisions fields, and admin_users fields
-- Created: 2025-11-29

-- ============================================================================
-- MEMBERS TABLE - ADD MISSING EMAIL COLUMN
-- ============================================================================

-- Email column was referenced in types but not added in migration 003
ALTER TABLE members ADD COLUMN IF NOT EXISTS email VARCHAR(255);

COMMENT ON COLUMN members.email IS 'Email address from Nominal Roll or manual entry';

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

-- ============================================================================
-- DIVISIONS TABLE - ADD MISSING COLUMNS AND TRIGGER
-- ============================================================================

-- Add description column (referenced in Division interface)
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN divisions.description IS 'Description of the division';

-- Add updated_at column for Division.updatedAt interface requirement
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

COMMENT ON COLUMN divisions.updated_at IS 'Timestamp of last update';

-- Create trigger to auto-update divisions.updated_at
DROP TRIGGER IF EXISTS update_divisions_updated_at ON divisions;
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ADMIN_USERS TABLE - RESTRUCTURE FOR TYPE ALIGNMENT
-- ============================================================================

-- Add new columns for proper name separation (required by AdminUser interface)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
-- Add email as nullable first, will add constraint after data migration
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- For existing rows, split full_name into first_name and last_name
-- This handles both single names and names with spaces
UPDATE admin_users
SET
  first_name = COALESCE(NULLIF(TRIM(SUBSTRING(full_name FROM 1 FOR POSITION(' ' IN full_name) - 1)), ''), TRIM(full_name)),
  last_name = CASE
    WHEN POSITION(' ' IN full_name) > 0 THEN TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
    ELSE ''
  END,
  email = COALESCE(email, LOWER(REPLACE(REPLACE(full_name, ' ', '.'), '''', '')) || '@sentinel.local')
WHERE first_name IS NULL;

-- Make first_name and last_name NOT NULL after data migration
ALTER TABLE admin_users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE admin_users ALTER COLUMN last_name SET NOT NULL;

-- Create trigger for updated_at on admin_users
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint on email after data is populated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_email_key'
  ) THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_email_key UNIQUE (email);
  END IF;
END $$;

-- Add comments explaining the columns
COMMENT ON COLUMN admin_users.first_name IS 'First name of admin user (required by AdminUser interface)';
COMMENT ON COLUMN admin_users.last_name IS 'Last name of admin user (required by AdminUser interface)';
COMMENT ON COLUMN admin_users.email IS 'Email address of admin user (required by AdminUser interface)';
COMMENT ON COLUMN admin_users.updated_at IS 'Timestamp of last update (required by AdminUser interface)';

-- ============================================================================
-- INDEXES FOR ADMIN_USERS ALIGNMENT
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- This migration completes the schema/type alignment by:
--
-- 1. MEMBERS TABLE:
--    - Added: email VARCHAR(255) - for AdminUser.email requirement
--
-- 2. DIVISIONS TABLE:
--    - Added: description TEXT - for Division.description interface
--    - Added: updated_at TIMESTAMP - for Division.updatedAt interface
--    - Created: update_divisions_updated_at trigger for auto-update
--
-- 3. ADMIN_USERS TABLE:
--    - Added: first_name VARCHAR(100) - replaces use of full_name
--    - Added: last_name VARCHAR(100) - replaces use of full_name
--    - Added: email VARCHAR(255) UNIQUE - for AdminUser.email requirement
--    - Added: updated_at TIMESTAMP - for AdminUser.updatedAt interface
--    - Updated: Existing full_name values split into first_name/last_name
--    - Created: update_admin_users_updated_at trigger for auto-update
--
-- All new columns are nullable except first_name, last_name, email (required by types)
-- Indexes created for email columns for efficient lookups
-- ============================================================================
