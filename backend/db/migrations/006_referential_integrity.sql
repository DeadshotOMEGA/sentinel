-- Migration: 006_referential_integrity
-- Description: Add proper foreign key constraints with ON DELETE rules
-- Created: 2025-11-29
-- Security Issue: HIGH-9 - Missing referential integrity constraints

-- ============================================================================
-- STEP 1: Drop existing FK constraints that need ON DELETE rules
-- ============================================================================

-- Members -> Divisions (currently no ON DELETE)
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_division_id_fkey;

-- Checkins -> Members (currently no ON DELETE)
ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_member_id_fkey;

-- Checkins -> Badges (currently no ON DELETE)
ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_badge_id_fkey;

-- Visitors -> Events (currently no ON DELETE)
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_event_id_fkey;

-- Visitors -> Members (host) (currently no ON DELETE)
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_host_member_id_fkey;

-- Visitors -> Badges (temp badge) (currently no ON DELETE)
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_temporary_badge_id_fkey;

-- Audit log -> Admin users (currently no ON DELETE)
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_admin_user_id_fkey;

-- ============================================================================
-- STEP 2: Add FK constraints with proper ON DELETE rules
-- ============================================================================

-- Members -> Divisions: RESTRICT (can't delete division with members)
ALTER TABLE members
  ADD CONSTRAINT members_division_id_fkey
  FOREIGN KEY (division_id) REFERENCES divisions(id)
  ON DELETE RESTRICT;

-- Checkins -> Members: RESTRICT (can't delete member with checkin history)
-- Note: Members should be deactivated, not deleted
ALTER TABLE checkins
  ADD CONSTRAINT checkins_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id)
  ON DELETE RESTRICT;

-- Checkins -> Badges: RESTRICT (can't delete badge with checkin history)
ALTER TABLE checkins
  ADD CONSTRAINT checkins_badge_id_fkey
  FOREIGN KEY (badge_id) REFERENCES badges(id)
  ON DELETE RESTRICT;

-- Visitors -> Events: SET NULL (event deletion doesn't delete visitor record)
ALTER TABLE visitors
  ADD CONSTRAINT visitors_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id)
  ON DELETE SET NULL;

-- Visitors -> Members (host): SET NULL (host deletion doesn't delete visitor)
ALTER TABLE visitors
  ADD CONSTRAINT visitors_host_member_id_fkey
  FOREIGN KEY (host_member_id) REFERENCES members(id)
  ON DELETE SET NULL;

-- Visitors -> Badges (temp): SET NULL (badge deletion sets to null)
ALTER TABLE visitors
  ADD CONSTRAINT visitors_temporary_badge_id_fkey
  FOREIGN KEY (temporary_badge_id) REFERENCES badges(id)
  ON DELETE SET NULL;

-- Audit log -> Admin users: SET NULL (preserve audit trail if admin deleted)
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_admin_user_id_fkey
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
  ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: Add missing FK for badges.assigned_to_id
-- Note: This is polymorphic (can be member or event attendee), so we add a
-- partial constraint for member assignments only via a trigger
-- ============================================================================

-- Create a function to validate badge assignments
CREATE OR REPLACE FUNCTION validate_badge_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if badge is assigned to a member
  IF NEW.assignment_type = 'member' AND NEW.assigned_to_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM members WHERE id = NEW.assigned_to_id) THEN
      RAISE EXCEPTION 'Badge assigned_to_id must reference a valid member when assignment_type is ''member''';
    END IF;
  END IF;

  -- For event assignments, validation happens in event_attendees table (separate FK)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for badge assignment validation
DROP TRIGGER IF EXISTS validate_badge_assignment_trigger ON badges;
CREATE TRIGGER validate_badge_assignment_trigger
  BEFORE INSERT OR UPDATE ON badges
  FOR EACH ROW
  EXECUTE FUNCTION validate_badge_assignment();

-- ============================================================================
-- STEP 4: Add indexes to support FK constraints (if not exists)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_badges_assignment_type ON badges(assignment_type);
CREATE INDEX IF NOT EXISTS idx_visitors_temporary_badge ON visitors(temporary_badge_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT members_division_id_fkey ON members IS 'RESTRICT: Cannot delete division with active members';
COMMENT ON CONSTRAINT checkins_member_id_fkey ON checkins IS 'RESTRICT: Cannot delete member with check-in history (use deactivation instead)';
COMMENT ON CONSTRAINT checkins_badge_id_fkey ON checkins IS 'RESTRICT: Cannot delete badge with check-in history';
COMMENT ON CONSTRAINT visitors_event_id_fkey ON visitors IS 'SET NULL: Event deletion preserves visitor record';
COMMENT ON CONSTRAINT visitors_host_member_id_fkey ON visitors IS 'SET NULL: Host deletion preserves visitor record';
COMMENT ON CONSTRAINT visitors_temporary_badge_id_fkey ON visitors IS 'SET NULL: Badge deletion clears temporary assignment';
COMMENT ON CONSTRAINT audit_log_admin_user_id_fkey ON audit_log IS 'SET NULL: Admin deletion preserves audit trail';
