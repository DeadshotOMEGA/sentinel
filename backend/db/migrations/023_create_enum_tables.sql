-- Migration: 023_create_enum_tables
-- Description: Create enum lookup tables for visit_types, member_statuses, member_types, and badge_statuses
-- Created: 2026-01-15

-- ============================================================================
-- ENUM TABLES
-- ============================================================================

-- Visit Types
CREATE TABLE visit_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Member Statuses
CREATE TABLE member_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Member Types
CREATE TABLE member_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Badge Statuses
CREATE TABLE badge_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_types_code ON visit_types(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_statuses_code ON member_statuses(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_types_code ON member_types(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_badge_statuses_code ON badge_statuses(code);

-- ============================================================================
-- TRIGGERS (updated_at)
-- ============================================================================

CREATE TRIGGER update_visit_types_updated_at BEFORE UPDATE ON visit_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_statuses_updated_at BEFORE UPDATE ON member_statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_types_updated_at BEFORE UPDATE ON member_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badge_statuses_updated_at BEFORE UPDATE ON badge_statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Visit Types (from CHECK constraint on visitors.visit_type)
INSERT INTO visit_types (code, name, description) VALUES
    ('contractor', 'Contractor', 'External contractor visit'),
    ('recruitment', 'Recruitment', 'Recruitment event visit'),
    ('event', 'Event', 'Special event visit'),
    ('official', 'Official', 'Official business visit'),
    ('museum', 'Museum', 'Museum visitor'),
    ('other', 'Other', 'Other type of visit');

-- Member Statuses (from CHECK constraint on members.status)
INSERT INTO member_statuses (code, name, description) VALUES
    ('active', 'Active', 'Currently active member'),
    ('inactive', 'Inactive', 'Inactive member'),
    ('pending_review', 'Pending Review', 'Member pending review'),
    ('terminated', 'Terminated', 'Terminated member');

-- Member Types (reserve classification)
INSERT INTO member_types (code, name, description) VALUES
    ('class_a', 'Class A', 'Class A reserve member'),
    ('class_b', 'Class B', 'Class B reserve member (full-time)'),
    ('class_c', 'Class C', 'Class C reserve member (full-time)'),
    ('reg_force', 'Regular Force', 'Regular force member');

-- Badge Statuses (from CHECK constraint on badges.status)
INSERT INTO badge_statuses (code, name, description) VALUES
    ('active', 'Active', 'Badge is active and in use'),
    ('disabled', 'Disabled', 'Badge is disabled'),
    ('lost', 'Lost', 'Badge has been reported lost'),
    ('returned', 'Returned', 'Badge has been returned');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE visit_types IS 'Lookup table for visitor type classifications';
COMMENT ON TABLE member_statuses IS 'Lookup table for member status values';
COMMENT ON TABLE member_types IS 'Lookup table for member type classifications (reserve classes)';
COMMENT ON TABLE badge_statuses IS 'Lookup table for badge status values';
