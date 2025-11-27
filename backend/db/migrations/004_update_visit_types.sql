-- Migration: 004_update_visit_types
-- Description: Update visit_type enum values (remove general/course, add museum)
-- Created: 2025-11-26

-- ============================================================================
-- UPDATE VISIT_TYPE CONSTRAINT
-- ============================================================================

-- First, update any existing records with old values
UPDATE visitors SET visit_type = 'other' WHERE visit_type IN ('general', 'course');

-- Drop old constraint
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_visit_type_check;

-- Add new constraint with updated values
ALTER TABLE visitors ADD CONSTRAINT visitors_visit_type_check
  CHECK (visit_type IN ('contractor', 'recruitment', 'event', 'official', 'museum', 'other'));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN visitors.visit_type IS 'Type of visit: contractor (Contractor/SSC), recruitment, event, official, museum, other';
