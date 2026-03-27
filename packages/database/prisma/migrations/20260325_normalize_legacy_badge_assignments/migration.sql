UPDATE members m
SET badge_id = b.id,
    updated_at = NOW()
FROM badges b
WHERE b.assignment_type = 'permanent'
  AND b.assigned_to_id = m.id
  AND m.badge_id IS NULL;

UPDATE badges b
SET assignment_type = 'member',
    assigned_to_id = m.id,
    updated_at = NOW()
FROM members m
WHERE m.badge_id = b.id
  AND b.assignment_type = 'permanent';

UPDATE badges
SET assignment_type = 'member',
    updated_at = NOW()
WHERE assignment_type = 'permanent';

UPDATE badges b
SET assignment_type = 'unassigned',
    assigned_to_id = NULL,
    updated_at = NOW()
WHERE b.assignment_type = 'member'
  AND NOT EXISTS (
    SELECT 1
    FROM members m
    WHERE m.id = b.assigned_to_id
      AND m.badge_id = b.id
  );

DELETE FROM badge_statuses
WHERE code = 'disabled'
  AND NOT EXISTS (
    SELECT 1
    FROM badges
    WHERE badges.badge_status_id = badge_statuses.id
  );
