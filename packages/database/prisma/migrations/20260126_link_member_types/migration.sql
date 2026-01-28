-- Migration: Link existing members to MemberType table
-- This migration:
-- 1. Creates MemberType records for any member_type values that don't exist
-- 2. Updates all members to set member_type_id based on their member_type string

-- Step 1: Insert missing member types from existing member data
INSERT INTO member_types (code, name, description)
SELECT DISTINCT
    m.member_type as code,
    CASE m.member_type
        WHEN 'class_a' THEN 'Class A Reserve'
        WHEN 'class_b' THEN 'Class B Reserve'
        WHEN 'class_c' THEN 'Class C Reserve'
        WHEN 'reg_force' THEN 'Regular Force'
        ELSE m.member_type  -- Use code as name for any unknown types
    END as name,
    NULL as description
FROM members m
WHERE m.member_type IS NOT NULL
  AND m.member_type != ''
  AND NOT EXISTS (
    SELECT 1 FROM member_types mt WHERE mt.code = m.member_type
  );

-- Step 2: Update all members to link to their MemberType record
UPDATE members m
SET member_type_id = mt.id
FROM member_types mt
WHERE m.member_type = mt.code
  AND m.member_type_id IS NULL;

-- Step 3: Verify the migration (this will show any members without a linked type)
-- SELECT COUNT(*) as unlinked_members
-- FROM members
-- WHERE member_type IS NOT NULL
--   AND member_type != ''
--   AND member_type_id IS NULL;
