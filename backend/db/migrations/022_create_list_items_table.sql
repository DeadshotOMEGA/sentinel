-- Migration: 022_create_list_items_table
-- Description: Create list_items table for configurable dropdown values (event roles, ranks, mess, moc)
-- Created: 2026-01-15

-- ============================================================================
-- LIST ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_type VARCHAR(50) NOT NULL,                    -- event_role, rank, mess, moc
    value VARCHAR(200) NOT NULL,
    display_order INT DEFAULT 0,
    description TEXT,
    is_system BOOLEAN DEFAULT false,                   -- System values cannot be deleted by users
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Unique constraint to prevent duplicates within a list type
CREATE UNIQUE INDEX IF NOT EXISTS idx_list_items_type_value ON list_items(list_type, value);

-- Index on list_type for faster queries
CREATE INDEX IF NOT EXISTS idx_list_items_type ON list_items(list_type);

-- ============================================================================
-- TRIGGER
-- ============================================================================

-- Use shared updated_at trigger function from migration 001
CREATE TRIGGER update_list_items_updated_at BEFORE UPDATE ON list_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATE EVENT ROLES FROM REPORT_SETTINGS
-- ============================================================================

-- Migrate event_roles JSON array from report_settings to list_items
-- Each role becomes a list_item with list_type='event_role', is_system=true
DO $$
DECLARE
    event_roles_json JSONB;
    role_value TEXT;
    role_index INT := 0;
BEGIN
    -- Try to get event_roles from report_settings
    SELECT value INTO event_roles_json
    FROM report_settings
    WHERE key = 'event_roles';

    -- Only process if event_roles exists and is an array
    IF event_roles_json IS NOT NULL AND jsonb_typeof(event_roles_json) = 'array' THEN
        FOR role_value IN SELECT jsonb_array_elements_text(event_roles_json)
        LOOP
            INSERT INTO list_items (list_type, value, display_order, is_system)
            VALUES ('event_role', role_value, role_index, true)
            ON CONFLICT (list_type, value) DO NOTHING;

            role_index := role_index + 1;
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- SEED FROM MEMBERS TABLE
-- ============================================================================

-- Seed ranks from existing members (non-system since they come from data)
INSERT INTO list_items (list_type, value, display_order, is_system)
SELECT DISTINCT 'rank', rank, 0, false
FROM members
WHERE rank IS NOT NULL AND rank != ''
ORDER BY rank
ON CONFLICT (list_type, value) DO NOTHING;

-- Seed mess values from existing members
INSERT INTO list_items (list_type, value, display_order, is_system)
SELECT DISTINCT 'mess', mess, 0, false
FROM members
WHERE mess IS NOT NULL AND mess != ''
ORDER BY mess
ON CONFLICT (list_type, value) DO NOTHING;

-- Seed moc values from existing members
INSERT INTO list_items (list_type, value, display_order, is_system)
SELECT DISTINCT 'moc', moc, 0, false
FROM members
WHERE moc IS NOT NULL AND moc != ''
ORDER BY moc
ON CONFLICT (list_type, value) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE list_items IS 'Configurable dropdown values for event roles, ranks, mess assignments, and MOCs';
COMMENT ON COLUMN list_items.list_type IS 'Type of list: event_role, rank, mess, moc';
COMMENT ON COLUMN list_items.value IS 'The display value shown in dropdowns';
COMMENT ON COLUMN list_items.display_order IS 'Sort order within the list type (lower numbers first)';
COMMENT ON COLUMN list_items.is_system IS 'System values cannot be deleted by users';
