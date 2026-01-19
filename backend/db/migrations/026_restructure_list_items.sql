-- Migration: 026_restructure_list_items
-- Description: Restructure list_items table to have separate code/name fields instead of single value
-- Created: 2026-01-15

-- ============================================================================
-- ADD NEW COLUMNS
-- ============================================================================

-- Add code column (unique identifier within list type)
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS code VARCHAR(50) DEFAULT '';

-- Add name column (display name)
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS name VARCHAR(200) DEFAULT '';

-- ============================================================================
-- MIGRATE DATA
-- ============================================================================

-- Migrate existing data:
-- code = lowercase value with underscores (sanitized for code usage)
-- name = original value (for display)
UPDATE list_items SET
  code = LOWER(REPLACE(REPLACE(REPLACE(value, ' ', '_'), '-', '_'), '''', '')),
  name = value
WHERE code = '' OR name = '';

-- ============================================================================
-- MAKE COLUMNS NOT NULL
-- ============================================================================

ALTER TABLE list_items ALTER COLUMN code SET NOT NULL;
ALTER TABLE list_items ALTER COLUMN name SET NOT NULL;

-- ============================================================================
-- DROP OLD COLUMN
-- ============================================================================

ALTER TABLE list_items DROP COLUMN IF EXISTS value;

-- ============================================================================
-- UPDATE CONSTRAINTS
-- ============================================================================

-- Drop old unique constraint on (list_type, value)
DROP INDEX IF EXISTS idx_list_items_type_value;

-- Create new unique constraint on (list_type, code)
CREATE UNIQUE INDEX IF NOT EXISTS idx_list_items_type_code ON list_items(list_type, code);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN list_items.code IS 'Unique identifier within list type (lowercase, underscores)';
COMMENT ON COLUMN list_items.name IS 'Display name shown in dropdowns';
