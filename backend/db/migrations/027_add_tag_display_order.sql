-- Migration: 027_add_tag_display_order
-- Description: Add display_order column to tags table for custom ordering/reordering
-- Created: 2026-01-16

-- ============================================================================
-- ADD DISPLAY_ORDER COLUMN
-- ============================================================================

ALTER TABLE tags ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- ============================================================================
-- INITIALIZE DISPLAY_ORDER FOR EXISTING TAGS
-- ============================================================================

-- Set display_order for existing tags based on alphabetical order by name
-- Using a subquery with row_number() to assign sequential order values
WITH ordered_tags AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) as new_order
    FROM tags
)
UPDATE tags
SET display_order = ordered_tags.new_order
FROM ordered_tags
WHERE tags.id = ordered_tags.id;

-- ============================================================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tags_display_order ON tags(display_order);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN tags.display_order IS 'Sort order for tag display (lower numbers appear first)';
