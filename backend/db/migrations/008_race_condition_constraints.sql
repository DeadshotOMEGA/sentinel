-- Migration: 008_race_condition_constraints
-- Description: Add database-level protection against duplicate check-ins (ARCH-05)
-- This is a defense-in-depth measure alongside Redis atomic operations
--
-- Context:
-- Redis atomic operations (SETNX) provide primary protection against race conditions,
-- but this database constraint acts as a safety net for any edge cases that might
-- slip through (e.g., Redis failures, network partitions, or bugs in application logic).
--
-- The constraint prevents:
-- - Same member_id
-- - Same direction (in/out)
-- - Within the same second (truncated timestamp)
--
-- This ensures no duplicate check-ins can ever be persisted to the database,
-- regardless of application-level failures.

-- Prevent duplicate check-ins within the same second for the same member
-- This catches any duplicates that slip through Redis
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_member_direction_dedup
ON checkins (member_id, direction, date_trunc('second', timestamp));
