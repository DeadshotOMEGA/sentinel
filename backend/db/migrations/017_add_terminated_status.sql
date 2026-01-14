-- Migration: Add 'terminated' status to members table
-- This aligns the database constraint with the application code

-- Drop and recreate the status check constraint to include 'terminated'
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_status_check;
ALTER TABLE members ADD CONSTRAINT members_status_check
  CHECK (status IN ('active', 'inactive', 'pending_review', 'terminated'));
