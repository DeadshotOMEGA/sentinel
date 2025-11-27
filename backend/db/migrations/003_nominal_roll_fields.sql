-- Migration: 003_nominal_roll_fields
-- Description: Add Nominal Roll import fields and update member types
-- Created: 2025-11-26

-- ============================================================================
-- UPDATE MEMBER_TYPE CONSTRAINT
-- ============================================================================

-- Drop old constraint first
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_member_type_check;

-- Convert existing members to class_a BEFORE adding new constraint
UPDATE members SET member_type = 'class_a' WHERE member_type IN ('full_time', 'reserve');

-- Now add new constraint with updated values
ALTER TABLE members ADD CONSTRAINT members_member_type_check
  CHECK (member_type IN ('class_a', 'class_b', 'class_c', 'reg_force'));

-- ============================================================================
-- ADD NEW COLUMNS TO MEMBERS TABLE
-- ============================================================================

-- Employee number from Nominal Roll
ALTER TABLE members ADD COLUMN IF NOT EXISTS employee_number VARCHAR(20);

-- Initials (middle initials from Nominal Roll)
ALTER TABLE members ADD COLUMN IF NOT EXISTS initials VARCHAR(10);

-- Mess assignment (Junior Ranks, Wardroom, C&POs)
ALTER TABLE members ADD COLUMN IF NOT EXISTS mess VARCHAR(50);

-- Military Occupation Code name
ALTER TABLE members ADD COLUMN IF NOT EXISTS moc VARCHAR(100);

-- Class details (raw value from DETAILS column: "Class B", "Class C", etc.)
ALTER TABLE members ADD COLUMN IF NOT EXISTS class_details VARCHAR(100);

-- Home phone (separate from mobile)
ALTER TABLE members ADD COLUMN IF NOT EXISTS home_phone VARCHAR(30);

-- Rename existing phone column to mobile_phone for clarity
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'phone') THEN
    ALTER TABLE members RENAME COLUMN phone TO mobile_phone;
  END IF;
END $$;

-- ============================================================================
-- ADD MEMBER STATUS FOR PENDING REVIEW
-- ============================================================================

-- Update status constraint to include 'pending_review' for import workflow
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_status_check;
ALTER TABLE members ADD CONSTRAINT members_status_check
  CHECK (status IN ('active', 'inactive', 'pending_review'));

-- ============================================================================
-- ADD NEW DIVISIONS FROM NOMINAL ROLL
-- ============================================================================

-- Insert new divisions if they don't exist (ON CONFLICT requires unique constraint which exists)
INSERT INTO divisions (name, code, description) VALUES
  ('Basic Military Qualification', 'BMQ', 'Members currently on BMQ training'),
  ('Operations', 'OPS', 'Operations department'),
  ('Deck', 'DECK', 'Deck department'),
  ('Administration', 'ADMIN', 'Administration department'),
  ('Logistics', 'LOG', 'Logistics department'),
  ('Band', 'BAND', 'Naval Reserve Band'),
  ('Training', 'TRG', 'Training department'),
  ('Command', 'CMD', 'Command element'),
  ('Public Affairs', 'PAO', 'Public Affairs Office')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ============================================================================
-- INDEXES FOR NEW COLUMNS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_members_employee_number ON members(employee_number);
CREATE INDEX IF NOT EXISTS idx_members_mess ON members(mess);
CREATE INDEX IF NOT EXISTS idx_members_moc ON members(moc);

-- ============================================================================
-- UPDATE VIEWS TO INCLUDE NEW FIELDS
-- ============================================================================

-- Drop and recreate active_members_view with new fields
DROP VIEW IF EXISTS active_members_view CASCADE;
CREATE VIEW active_members_view AS
SELECT
    m.id,
    m.service_number,
    m.employee_number,
    m.rank,
    m.first_name,
    m.last_name,
    m.initials,
    m.member_type,
    m.class_details,
    m.mess,
    m.moc,
    m.email,
    m.home_phone,
    m.mobile_phone,
    d.name as division_name,
    d.code as division_code,
    m.created_at
FROM members m
LEFT JOIN divisions d ON m.division_id = d.id
WHERE m.status = 'active';

-- Drop and recreate member_current_status_view with new fields
DROP VIEW IF EXISTS member_current_status_view CASCADE;
CREATE VIEW member_current_status_view AS
SELECT DISTINCT ON (member_id)
    c.member_id,
    c.direction as current_status,
    c.timestamp as status_since,
    c.kiosk_id,
    m.service_number,
    m.rank,
    m.first_name,
    m.last_name,
    m.initials,
    m.mess
FROM checkins c
JOIN members m ON c.member_id = m.id
WHERE m.status = 'active'
ORDER BY member_id, timestamp DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN members.employee_number IS 'Employee number from Nominal Roll (EMPL #)';
COMMENT ON COLUMN members.initials IS 'Middle initials from Nominal Roll';
COMMENT ON COLUMN members.mess IS 'Mess assignment: Junior Ranks, Wardroom, C&POs';
COMMENT ON COLUMN members.moc IS 'Military Occupation Code name';
COMMENT ON COLUMN members.class_details IS 'Raw class details: Class A, Class B, Class C, REG FORCE';
COMMENT ON COLUMN members.home_phone IS 'Home phone number';
COMMENT ON COLUMN members.mobile_phone IS 'Mobile phone number';
