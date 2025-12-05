-- Migration: Add manual check-in tracking
-- Tracks check-in method (badge vs admin_manual) and which admin initiated manual check-ins

-- Add method column to checkins table
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS method VARCHAR(20) DEFAULT 'badge';

-- Add check constraint for method values
ALTER TABLE checkins
  DROP CONSTRAINT IF EXISTS checkins_method_check;
ALTER TABLE checkins
  ADD CONSTRAINT checkins_method_check
  CHECK (method IN ('badge', 'admin_manual'));

-- Add created_by_admin to track which admin performed manual check-ins
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES admin_users(id);

-- Add admin_notes to visitors for extended manual entry form
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add check_in_method to visitors to track kiosk vs admin entry
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS check_in_method VARCHAR(20) DEFAULT 'kiosk';

-- Add check constraint for visitor check_in_method values
ALTER TABLE visitors
  DROP CONSTRAINT IF EXISTS visitors_check_in_method_check;
ALTER TABLE visitors
  ADD CONSTRAINT visitors_check_in_method_check
  CHECK (check_in_method IN ('kiosk', 'admin_manual'));

-- Add created_by_admin to visitors
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES admin_users(id);

-- Create index for querying by method (useful for audit reports)
CREATE INDEX IF NOT EXISTS idx_checkins_method ON checkins(method);
CREATE INDEX IF NOT EXISTS idx_visitors_check_in_method ON visitors(check_in_method);

-- Comment the new columns for documentation
COMMENT ON COLUMN checkins.method IS 'Check-in method: badge (RFID scan) or admin_manual (admin dashboard)';
COMMENT ON COLUMN checkins.created_by_admin IS 'Admin user who performed manual check-in (null for badge scans)';
COMMENT ON COLUMN visitors.admin_notes IS 'Internal notes from admin during manual visitor check-in';
COMMENT ON COLUMN visitors.check_in_method IS 'Check-in method: kiosk (self-service) or admin_manual (admin dashboard)';
COMMENT ON COLUMN visitors.created_by_admin IS 'Admin user who performed manual check-in (null for kiosk)';
