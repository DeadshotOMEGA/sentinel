-- Migration: 006_referential_integrity
-- Description: Add missing ON DELETE cascade/restrict rules to foreign keys
-- Created: 2025-11-29
-- Purpose: Fix HIGH-9 - Prevent orphaned records when parent records are deleted

-- ============================================================================
-- SAFETY CHECKS (BEFORE RUNNING)
-- ============================================================================
-- This migration alters FK constraints to enforce referential integrity
-- PostgreSQL will REJECT the migration if there are orphaned records
--
-- To check for existing orphaned records, run VALIDATION QUERIES (bottom of file)
-- ============================================================================

-- ============================================================================
-- PHASE 1: FIX CRITICAL CONSTRAINTS (IMMEDIATE)
-- ============================================================================

-- 1. CHECKINS → MEMBERS: CASCADE (historical data follows member)
ALTER TABLE checkins
DROP CONSTRAINT IF EXISTS checkins_member_id_fkey,
ADD CONSTRAINT checkins_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 2. CHECKINS → BADGES: RESTRICT (prevent badge deletion if in use)
ALTER TABLE checkins
DROP CONSTRAINT IF EXISTS checkins_badge_id_fkey,
ADD CONSTRAINT checkins_badge_id_fkey
  FOREIGN KEY (badge_id) REFERENCES badges(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 3. VISITORS → MEMBERS: RESTRICT (prevent host member deletion with active visitors)
ALTER TABLE visitors
DROP CONSTRAINT IF EXISTS visitors_host_member_id_fkey,
ADD CONSTRAINT visitors_host_member_id_fkey
  FOREIGN KEY (host_member_id) REFERENCES members(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 4. VISITORS → BADGES: SET NULL (badge lifecycle independent of visitor)
ALTER TABLE visitors
DROP CONSTRAINT IF EXISTS visitors_temporary_badge_id_fkey,
ADD CONSTRAINT visitors_temporary_badge_id_fkey
  FOREIGN KEY (temporary_badge_id) REFERENCES badges(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- 5. VISITORS → EVENTS: CASCADE (visitor-specific to event, cascade on delete)
ALTER TABLE visitors
DROP CONSTRAINT IF EXISTS visitors_event_id_fkey,
ADD CONSTRAINT visitors_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 6. BADGES → MEMBERS: ADD MISSING FK + SET NULL (optional assignment)
-- NOTE: This FK was completely missing! assigned_to_id had no constraint
ALTER TABLE badges
DROP CONSTRAINT IF EXISTS badges_assigned_to_id_fkey;  -- In case it exists

ALTER TABLE badges
ADD CONSTRAINT badges_assigned_to_id_fkey
  FOREIGN KEY (assigned_to_id) REFERENCES members(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 2: FIX SECONDARY CONSTRAINTS (MEDIUM PRIORITY)
-- ============================================================================

-- 7. AUDIT_LOG → ADMIN_USERS: RESTRICT (immutable audit trail - prevent deletion)
ALTER TABLE audit_log
DROP CONSTRAINT IF EXISTS audit_log_admin_user_id_fkey,
ADD CONSTRAINT audit_log_admin_user_id_fkey
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 8. EVENT_CHECKINS → BADGES: RESTRICT (prevent badge deletion if event check-in exists)
ALTER TABLE event_checkins
DROP CONSTRAINT IF EXISTS event_checkins_badge_id_fkey,
ADD CONSTRAINT event_checkins_badge_id_fkey
  FOREIGN KEY (badge_id) REFERENCES badges(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 9. MEMBERS → DIVISIONS: RESTRICT (prevent division deletion if members exist)
ALTER TABLE members
DROP CONSTRAINT IF EXISTS members_division_id_fkey,
ADD CONSTRAINT members_division_id_fkey
  FOREIGN KEY (division_id) REFERENCES divisions(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- NOTE: event_attendees and event_checkins already have CASCADE set in migration/002
-- No changes needed for those

-- ============================================================================
-- COMMENTS EXPLAINING CHANGES
-- ============================================================================

COMMENT ON CONSTRAINT checkins_member_id_fkey ON checkins IS
  'Cascade delete: when member deleted, their checkins are also deleted (historical data follows lifecycle)';

COMMENT ON CONSTRAINT checkins_badge_id_fkey ON checkins IS
  'Restrict delete: prevents deletion of badges that have check-in records';

COMMENT ON CONSTRAINT visitors_host_member_id_fkey ON visitors IS
  'Restrict delete: prevents deletion of members hosting active visitors';

COMMENT ON CONSTRAINT visitors_temporary_badge_id_fkey ON visitors IS
  'Set null on delete: visitor record persists even if temporary badge is removed';

COMMENT ON CONSTRAINT visitors_event_id_fkey ON visitors IS
  'Cascade delete: when event deleted, visitor records tied to that event are also deleted';

COMMENT ON CONSTRAINT badges_assigned_to_id_fkey ON badges IS
  'Set null on delete: badge becomes unassigned if member is deleted (optional assignment)';

COMMENT ON CONSTRAINT audit_log_admin_user_id_fkey ON audit_log IS
  'Restrict delete: prevents deletion of admin users with audit log records (compliance/immutable)';

COMMENT ON CONSTRAINT event_checkins_badge_id_fkey ON event_checkins IS
  'Restrict delete: prevents deletion of badges that have event check-in records';

COMMENT ON CONSTRAINT members_division_id_fkey ON members IS
  'Restrict delete: prevents deletion of divisions that have members assigned';

-- ============================================================================
-- ROLLBACK PROCEDURE (IF NEEDED)
-- ============================================================================
--
-- If this migration causes errors, run these commands to revert:
--
-- ALTER TABLE checkins
-- DROP CONSTRAINT checkins_member_id_fkey,
-- ADD CONSTRAINT checkins_member_id_fkey
--   FOREIGN KEY (member_id) REFERENCES members(id);
--
-- ALTER TABLE checkins
-- DROP CONSTRAINT checkins_badge_id_fkey,
-- ADD CONSTRAINT checkins_badge_id_fkey
--   FOREIGN KEY (badge_id) REFERENCES badges(id);
--
-- [etc for all other tables]
--
-- Note: This will revert to NO ACTION (no cascade/restrict)

-- ============================================================================
-- VALIDATION QUERIES (RUN BEFORE MIGRATION TO CHECK FOR ORPHANED RECORDS)
-- ============================================================================
--
-- Run these BEFORE applying migration to identify existing orphaned records
-- If these return rows, data must be cleaned up first
--
-- -- Find orphaned checkins (member_id refs non-existent member)
-- SELECT c.id, c.member_id FROM checkins c
-- LEFT JOIN members m ON c.member_id = m.id
-- WHERE c.member_id IS NOT NULL AND m.id IS NULL;
--
-- -- Find orphaned checkins (badge_id refs non-existent badge)
-- SELECT c.id, c.badge_id FROM checkins c
-- LEFT JOIN badges b ON c.badge_id = b.id
-- WHERE c.badge_id IS NOT NULL AND b.id IS NULL;
--
-- -- Find orphaned visitors (host_member_id refs non-existent member)
-- SELECT v.id, v.host_member_id FROM visitors v
-- LEFT JOIN members m ON v.host_member_id = m.id
-- WHERE v.host_member_id IS NOT NULL AND m.id IS NULL;
--
-- -- Find orphaned visitors (temporary_badge_id refs non-existent badge)
-- SELECT v.id, v.temporary_badge_id FROM visitors v
-- LEFT JOIN badges b ON v.temporary_badge_id = b.id
-- WHERE v.temporary_badge_id IS NOT NULL AND b.id IS NULL;
--
-- -- Find orphaned visitors (event_id refs non-existent event)
-- SELECT v.id, v.event_id FROM visitors v
-- LEFT JOIN events e ON v.event_id = e.id
-- WHERE v.event_id IS NOT NULL AND e.id IS NULL;
--
-- -- Find badges with assigned_to_id refs non-existent member
-- SELECT b.id, b.assigned_to_id FROM badges b
-- LEFT JOIN members m ON b.assigned_to_id = m.id
-- WHERE b.assigned_to_id IS NOT NULL AND m.id IS NULL;
--
-- -- Find orphaned audit_log (admin_user_id refs non-existent admin_users)
-- SELECT al.id, al.admin_user_id FROM audit_log al
-- LEFT JOIN admin_users au ON al.admin_user_id = au.id
-- WHERE al.admin_user_id IS NOT NULL AND au.id IS NULL;
--
-- -- Find orphaned event_checkins (badge_id refs non-existent badge)
-- SELECT ec.id, ec.badge_id FROM event_checkins ec
-- LEFT JOIN badges b ON ec.badge_id = b.id
-- WHERE ec.badge_id IS NULL;
--
-- -- Find orphaned members (division_id refs non-existent division)
-- SELECT m.id, m.division_id FROM members m
-- LEFT JOIN divisions d ON m.division_id = d.id
-- WHERE m.division_id IS NOT NULL AND d.id IS NULL;
--
-- ============================================================================

-- ============================================================================
-- POST-MIGRATION TESTS
-- ============================================================================
--
-- After migration completes, test each constraint:
--
-- -- Test 1: Verify CASCADE on checkins deletion (if we support hard delete)
-- -- BEGIN; DELETE FROM members WHERE id = '<test-member-id>';
-- -- SELECT COUNT(*) FROM checkins WHERE member_id = '<test-member-id>';  -- should be 0
-- -- ROLLBACK;
--
-- -- Test 2: Verify RESTRICT on badge deletion (try to delete badge with checkins)
-- -- BEGIN;
-- -- DELETE FROM badges WHERE id = '<badge-with-checkins-id>';  -- should ERROR
-- -- ROLLBACK;
--
-- -- Test 3: Verify RESTRICT on member deletion (try to delete member hosting visitor)
-- -- BEGIN;
-- -- DELETE FROM members WHERE id = '<member-hosting-visitor-id>';  -- should ERROR
-- -- ROLLBACK;
--
-- ============================================================================
