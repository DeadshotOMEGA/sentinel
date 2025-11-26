-- Migration: 002_event_attendees
-- Description: Event attendees and check-ins tables for Sentinel RFID Attendance System
-- Created: 2025-11-25

-- Event Attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  rank VARCHAR(50),
  organization VARCHAR(200) NOT NULL,
  role VARCHAR(100) NOT NULL,
  badge_id UUID REFERENCES badges(id),
  badge_assigned_at TIMESTAMP,
  access_start DATE,
  access_end DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'checked_out', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Event Check-ins table (separate from member checkins)
CREATE TABLE IF NOT EXISTS event_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_attendee_id UUID NOT NULL REFERENCES event_attendees(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('in', 'out')),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  kiosk_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_badge_id ON event_attendees(badge_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON event_attendees(status);

CREATE INDEX IF NOT EXISTS idx_event_checkins_attendee ON event_checkins(event_attendee_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_checkins_badge ON event_checkins(badge_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_timestamp ON event_checkins(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_checkins_kiosk ON event_checkins(kiosk_id, timestamp DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_event_attendees_updated_at BEFORE UPDATE ON event_attendees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update badge last_used timestamp on event check-in
CREATE OR REPLACE FUNCTION update_badge_last_used_on_event_checkin()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE badges
    SET last_used = NEW.timestamp
    WHERE id = NEW.badge_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_badge_last_used_on_event_checkin AFTER INSERT ON event_checkins
    FOR EACH ROW EXECUTE FUNCTION update_badge_last_used_on_event_checkin();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE event_attendees IS 'Attendees for special events with temporary badge assignments';
COMMENT ON TABLE event_checkins IS 'Check-in/check-out events for event attendees';
COMMENT ON COLUMN event_attendees.status IS 'Attendee status: pending (not yet active), active (within access window), checked_out (voluntarily left), expired (past access end date)';
