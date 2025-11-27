-- Sentinel RFID Attendance System - Database Schema
-- PostgreSQL 14+

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Divisions
CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Members (Full-Time Staff + Reserve Members)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_number VARCHAR(20) UNIQUE NOT NULL,
  rank VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  division_id UUID REFERENCES divisions(id),
  member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('full_time', 'reserve')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Badges (NFC cards assigned to members)
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('member', 'event', 'unassigned')),
  assigned_to_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'lost', 'returned')),
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Events (for Phase 7, but define now for FK)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  auto_expire_badges BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Check-ins (attendance events)
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  badge_id UUID REFERENCES badges(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('in', 'out')),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  kiosk_id VARCHAR(50) NOT NULL,
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Visitors
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  organization VARCHAR(200),
  visit_type VARCHAR(50) NOT NULL CHECK (visit_type IN ('contractor', 'recruitment', 'event', 'official', 'museum', 'other')),
  visit_reason TEXT,
  event_id UUID REFERENCES events(id),
  host_member_id UUID REFERENCES members(id),
  check_in_time TIMESTAMP NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMP,
  temporary_badge_id UUID REFERENCES badges(id),
  kiosk_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'viewer')),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Members indexes
CREATE INDEX idx_members_service_number ON members(service_number);
CREATE INDEX idx_members_division ON members(division_id);
CREATE INDEX idx_members_status ON members(status);

-- Badges indexes
CREATE INDEX idx_badges_serial_number ON badges(serial_number);
CREATE INDEX idx_badges_assigned_to ON badges(assigned_to_id);
CREATE INDEX idx_badges_status ON badges(status);

-- Check-ins indexes (critical for performance)
CREATE INDEX idx_checkins_member_timestamp ON checkins(member_id, timestamp DESC);
CREATE INDEX idx_checkins_timestamp ON checkins(timestamp DESC);
CREATE INDEX idx_checkins_badge ON checkins(badge_id);
CREATE INDEX idx_checkins_kiosk ON checkins(kiosk_id, timestamp DESC);

-- Visitors indexes
CREATE INDEX idx_visitors_check_in_time ON visitors(check_in_time DESC);
CREATE INDEX idx_visitors_check_out_time ON visitors(check_out_time);
CREATE INDEX idx_visitors_host ON visitors(host_member_id);
CREATE INDEX idx_visitors_event ON visitors(event_id);

-- Events indexes
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_dates ON events(start_date, end_date);

-- Audit log indexes
CREATE INDEX idx_audit_log_admin_created ON audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update badge last_used timestamp on check-in
CREATE OR REPLACE FUNCTION update_badge_last_used()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE badges
    SET last_used = NEW.timestamp
    WHERE id = NEW.badge_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_badge_last_used_on_checkin AFTER INSERT ON checkins
    FOR EACH ROW EXECUTE FUNCTION update_badge_last_used();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active members view with division details
CREATE VIEW active_members_view AS
SELECT
    m.id,
    m.service_number,
    m.rank,
    m.first_name,
    m.last_name,
    m.member_type,
    d.name as division_name,
    d.code as division_code,
    m.created_at
FROM members m
LEFT JOIN divisions d ON m.division_id = d.id
WHERE m.status = 'active';

-- Current status view (last check-in per member)
CREATE VIEW member_current_status_view AS
SELECT DISTINCT ON (member_id)
    c.member_id,
    c.direction as current_status,
    c.timestamp as status_since,
    c.kiosk_id,
    m.service_number,
    m.rank,
    m.first_name,
    m.last_name
FROM checkins c
JOIN members m ON c.member_id = m.id
WHERE m.status = 'active'
ORDER BY member_id, timestamp DESC;

-- Active visitors view
CREATE VIEW active_visitors_view AS
SELECT
    v.id,
    v.name,
    v.organization,
    v.visit_type,
    v.visit_reason,
    v.check_in_time,
    v.kiosk_id,
    m.rank as host_rank,
    m.first_name as host_first_name,
    m.last_name as host_last_name,
    b.serial_number as badge_serial
FROM visitors v
LEFT JOIN members m ON v.host_member_id = m.id
LEFT JOIN badges b ON v.temporary_badge_id = b.id
WHERE v.check_out_time IS NULL
ORDER BY v.check_in_time DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE divisions IS 'Organizational divisions within the unit';
COMMENT ON TABLE members IS 'Full-time staff and reserve members';
COMMENT ON TABLE badges IS 'NFC badges for access control and attendance';
COMMENT ON TABLE checkins IS 'Check-in/check-out events';
COMMENT ON TABLE visitors IS 'Visitor records with temporary access';
COMMENT ON TABLE events IS 'Special events requiring temporary badge assignments';
COMMENT ON TABLE admin_users IS 'Admin portal user accounts';
COMMENT ON TABLE audit_log IS 'Audit trail for all administrative actions';
