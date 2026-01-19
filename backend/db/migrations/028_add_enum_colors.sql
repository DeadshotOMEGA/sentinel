-- Add color column to enum tables for consistent visual identification

-- Add color to visit_types
ALTER TABLE visit_types ADD COLUMN color VARCHAR(50);

-- Add color to badge_statuses
ALTER TABLE badge_statuses ADD COLUMN color VARCHAR(50);

-- Add color to member_statuses
ALTER TABLE member_statuses ADD COLUMN color VARCHAR(50);

-- Seed default colors for visit_types
UPDATE visit_types SET color = 'blue' WHERE code = 'contractor';
UPDATE visit_types SET color = 'green' WHERE code = 'cadet';
UPDATE visit_types SET color = 'purple' WHERE code = 'guest';
UPDATE visit_types SET color = 'orange' WHERE code = 'official';

-- Seed default colors for badge_statuses
UPDATE badge_statuses SET color = 'green' WHERE code = 'active';
UPDATE badge_statuses SET color = 'yellow' WHERE code = 'disabled';
UPDATE badge_statuses SET color = 'red' WHERE code = 'lost';
UPDATE badge_statuses SET color = 'slate' WHERE code = 'returned';

-- Seed default colors for member_statuses
UPDATE member_statuses SET color = 'green' WHERE code = 'active';
UPDATE member_statuses SET color = 'yellow' WHERE code = 'leave';
UPDATE member_statuses SET color = 'red' WHERE code = 'inactive';
UPDATE member_statuses SET color = 'purple' WHERE code = 'transferred';
UPDATE member_statuses SET color = 'slate' WHERE code = 'released';
