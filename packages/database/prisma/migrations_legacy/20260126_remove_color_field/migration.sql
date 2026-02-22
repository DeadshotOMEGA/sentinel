-- Remove redundant 'color' field from enum tables
-- We only need chipColor (structured color names) not color (free-form hex values)

-- Drop color column from member_types
ALTER TABLE member_types DROP COLUMN IF EXISTS color;

-- Drop color column from member_statuses
ALTER TABLE member_statuses DROP COLUMN IF EXISTS color;

-- Drop color column from visit_types
ALTER TABLE visit_types DROP COLUMN IF EXISTS color;

-- Drop color column from badge_statuses
ALTER TABLE badge_statuses DROP COLUMN IF EXISTS color;

-- Drop color column from tags
ALTER TABLE tags DROP COLUMN IF EXISTS color;
